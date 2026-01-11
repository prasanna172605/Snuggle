
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, SignalingMessage, CallType } from '../types';
import { DBService } from '../services/database';

interface CallContextType {
  isInCall: boolean;
  incomingCall: { callerId: string; type: CallType } | null;
  activeCall: { userId: string; type: CallType } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionQuality: 'high' | 'medium' | 'low';
  startCall: (receiverId: string, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode; currentUser: User | null }> = ({ children, currentUser }) => {
  const [incomingCall, setIncomingCall] = useState<{ callerId: string; type: CallType } | null>(null);
  const [activeCall, setActiveCall] = useState<{ userId: string; type: CallType } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'high' | 'medium' | 'low'>('high');

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callStartTime = useRef<number>(0);
  const callInitiator = useRef<string>(''); // Track who initiated the call
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const qualityMonitorInterval = useRef<NodeJS.Timeout | null>(null);

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
  };

  useEffect(() => {
    if (!currentUser) return;

    console.log('[CallContext] Subscribing to Firestore signals for:', currentUser.id);
    const unsubscribe = DBService.subscribeToSignals(currentUser.id, (signal) => {
      console.log('[CallContext] Received signal:', signal.type);
      handleSignalMessage(signal);
    });

    return () => {
      console.log('[CallContext] Unsubscribing from signals');
      unsubscribe();
    };
  }, [currentUser]);

  const createPeerConnection = () => {
    if (peerConnection.current) return peerConnection.current;

    const pc = new RTCPeerConnection(servers);

    pc.onicecandidate = (event) => {
      if (event.candidate && activeCall) {
        DBService.sendSignal({
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          senderId: currentUser!.id,
          receiverId: activeCall.userId,
          timestamp: Date.now(),
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received track:', event.track.kind, 'Enabled:', event.track.enabled);
      if (event.streams && event.streams[0]) {
        console.log('[WebRTC] Remote stream tracks:', event.streams[0].getTracks().map(t => `${t.kind}:${t.enabled}`));
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        // Start monitoring quality when connected
        startQualityMonitoring();
        // Set start time if not already set
        if (callStartTime.current === 0) {
          callStartTime.current = Date.now();
        }
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        stopQualityMonitoring();
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  // Monitor connection quality and adjust bitrate
  const monitorConnectionQuality = async () => {
    const pc = peerConnection.current;
    if (!pc) return;

    try {
      const stats = await pc.getStats();
      let bytesReceived = 0;
      let packetsLost = 0;
      let packetsReceived = 0;

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          bytesReceived = report.bytesReceived || 0;
          packetsLost = report.packetsLost || 0;
          packetsReceived = report.packetsReceived || 0;
        }
      });

      // Calculate packet loss percentage
      const totalPackets = packetsLost + packetsReceived;
      const packetLossPercentage = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

      // Determine quality based on packet loss
      let newQuality: 'high' | 'medium' | 'low' = 'high';
      if (packetLossPercentage > 10) {
        newQuality = 'low';
      } else if (packetLossPercentage > 3) {
        newQuality = 'medium';
      }

      // Update quality if changed
      if (newQuality !== connectionQuality) {
        console.log('[Quality] Adjusting from', connectionQuality, 'to', newQuality, 'Packet loss:', packetLossPercentage.toFixed(2) + '%');
        setConnectionQuality(newQuality);
        adjustBitrate(pc, newQuality);
      }
    } catch (error) {
      console.error('[Quality] Error monitoring:', error);
    }
  };

  // Adjust video bitrate based on quality
  const adjustBitrate = async (pc: RTCPeerConnection, quality: 'high' | 'medium' | 'low') => {
    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
    if (!sender) return;

    try {
      const parameters = sender.getParameters();
      if (!parameters.encodings || parameters.encodings.length === 0) {
        parameters.encodings = [{}];
      }

      // Set bitrate based on quality
      switch (quality) {
        case 'high':
          parameters.encodings[0].maxBitrate = 1500000; // 1.5 Mbps
          break;
        case 'medium':
          parameters.encodings[0].maxBitrate = 500000; // 500 Kbps
          break;
        case 'low':
          parameters.encodings[0].maxBitrate = 150000; // 150 Kbps
          break;
      }

      await sender.setParameters(parameters);
      console.log('[Quality] Bitrate adjusted to', quality);
    } catch (error) {
      console.error('[Quality] Error adjusting bitrate:', error);
    }
  };

  // Start quality monitoring
  function startQualityMonitoring() {
    stopQualityMonitoring(); // Clear any existing interval
    qualityMonitorInterval.current = setInterval(monitorConnectionQuality, 2000); // Check every 2 seconds
    console.log('[Quality] Monitoring started');
  }
  // Stop quality monitoring
  function stopQualityMonitoring() {
    if (qualityMonitorInterval.current) {
      clearInterval(qualityMonitorInterval.current);
      qualityMonitorInterval.current = null;
      console.log('[Quality] Monitoring stopped');
    }
  }

  const startCall = async (receiverId: string, type: CallType) => {
    if (!currentUser) return;
    callStartTime.current = 0; // Reset timer
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true,
      });
      setLocalStream(stream);
      setIsCameraOff(type === 'audio'); // If audio call, camera effectively off initially for logic

      setActiveCall({ userId: receiverId, type });

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      DBService.sendSignal({
        type: 'offer',
        sdp: offer,
        senderId: currentUser.id,
        receiverId: receiverId,
        callType: type,
        timestamp: Date.now(),
      });

      // Send Push Notification
      const senderName = currentUser.fullName || "Incoming Call";
      DBService.sendPushNotification({
        receiverId: receiverId,
        title: senderName,
        body: `Incoming ${type} call...`,
        url: '/call', // Or specific call URL/scheme
        icon: currentUser.avatar,
        type: 'call',
        actions: [
          { action: 'accept', title: 'Answer' },
          { action: 'decline', title: 'Decline' }
        ]
      });
    } catch (err) {
      console.error('Error starting call:', err);
      alert('Could not access camera/microphone');
    }
  };

  const handleSignalMessage = async (data: SignalingMessage) => {
    if (!currentUser) return;

    if (data.type === 'offer') {
      // Allow incoming call even if in a call (Call Waiting)
      const caller = await DBService.getUserById(data.senderId);
      if (caller) {
        setIncomingCall({
          callerId: data.senderId,
          type: data.callType || 'audio'
        });
        (window as any).pendingOffer = data.sdp;
      }
    } else if (data.type === 'answer') {
      if (peerConnection.current && data.sdp) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        // Process queued candidates
        iceCandidatesQueue.current.forEach(async candidate => {
          await peerConnection.current?.addIceCandidate(candidate);
        });
        iceCandidatesQueue.current = [];
      }
    } else if (data.type === 'candidate') {
      if (peerConnection.current && data.candidate) {
        const candidate = new RTCIceCandidate(data.candidate);
        if (peerConnection.current.remoteDescription) {
          await peerConnection.current.addIceCandidate(candidate);
        } else {
          iceCandidatesQueue.current.push(data.candidate);
        }
      }
    } else if (data.type === 'end' || data.type === 'reject' || data.type === 'busy') {
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !currentUser) return;

    // If already in a call, end it first (Call Waiting - End & Accept)
    if (activeCall) {
      console.log('[CallContext] Ending current call to accept new one');

      const savedIncomingCall = { ...incomingCall };
      const savedOffer = (window as any).pendingOffer;

      // 1. Notify current active peer that the call is ending
      if (activeCall.userId) {
        DBService.sendSignal({
          type: 'end',
          senderId: currentUser.id,
          receiverId: activeCall.userId,
          timestamp: Date.now(),
        });

        // 2. Save history for the ended call
        const chatId = [currentUser.id, activeCall.userId].sort().join('_');
        await DBService.saveCallHistory(chatId, {
          type: activeCall.type,
          duration: Math.round((Date.now() - callStartTime.current) / 1000),
          status: 'completed',
          participants: [currentUser.id, activeCall.userId],
          callerId: callInitiator.current
        });
      }

      // 3. Manually cleanup current call without clearing incomingCall
      stopQualityMonitoring();
      localStream?.getTracks().forEach(track => track.stop());
      remoteStream?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
      peerConnection.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setActiveCall(null);
      setIsMicMuted(false);
      setIsCameraOff(false);
      setIsScreenSharing(false); // Ensure screen sharing state is reset
      setConnectionQuality('high');
      callStartTime.current = 0;
      callInitiator.current = '';

      // Now proceed to accept the saved incoming call
      const callerId = savedIncomingCall.callerId;
      const type = savedIncomingCall.type;
      (window as any).pendingOffer = savedOffer; // Restore pending offer for the new call

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video', // Use the type from the incoming call
          audio: true,
        });
        setLocalStream(stream);
        setIsCameraOff(type === 'audio'); // Set camera off if it's an audio call

        callStartTime.current = Date.now();
        callInitiator.current = callerId;

        setIncomingCall(null); // NOW we clear incoming call as we are making it active
        setActiveCall({ userId: callerId, type });

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = (window as any).pendingOffer;
        if (offer) {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          DBService.sendSignal({
            type: 'answer',
            sdp: answer,
            senderId: currentUser.id,
            receiverId: callerId,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error('Error accepting call (after ending previous):', err);
        setIncomingCall(null); // Clear incoming call if acceptance fails
        cleanupCall(); // Ensure full cleanup if new call setup fails
      }
      return; // Exit after handling call waiting scenario
    }

    // Standard accept (not in a call)
    try {
      const callerId = incomingCall.callerId;
      const type = incomingCall.type;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true,
      });
      setLocalStream(stream);
      setIncomingCall(null);
      setActiveCall({ userId: callerId, type });

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = (window as any).pendingOffer;
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        DBService.sendSignal({
          type: 'answer',
          sdp: answer,
          senderId: currentUser.id,
          receiverId: callerId,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanupCall();
    }
  };

  const rejectCall = () => {
    if (incomingCall && currentUser) {
      DBService.sendSignal({
        type: 'reject',
        senderId: currentUser.id,
        receiverId: incomingCall.callerId,
        timestamp: Date.now(),
      });
      setIncomingCall(null);
    }
  };

  const endCall = () => {
    if (activeCall && currentUser) {
      DBService.sendSignal({
        type: 'end',
        senderId: currentUser.id,
        receiverId: activeCall.userId,
        timestamp: Date.now(),
      });

      // Save history for the ended call
      const chatId = [currentUser.id, activeCall.userId].sort().join('_');
      DBService.saveCallHistory(chatId, {
        type: activeCall.type,
        duration: Math.round((Date.now() - callStartTime.current) / 1000),
        status: 'completed',
        participants: [currentUser.id, activeCall.userId],
        callerId: callInitiator.current
      }).catch(err => console.error('Error saving call history:', err));
      cleanupCall();
    };
  }

  function cleanupCall() {
    if (activeCall) {
      // Send end signal if we were in a call
      // Only if locally active? No, endCall handles signal. cleanup is internal.
    }

    stopQualityMonitoring(); // Stop quality monitoring

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    remoteStream?.getTracks().forEach(track => track.stop()); // Keep this line
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setIsMicMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false); // Reset screen share state
    setConnectionQuality('high'); // Reset quality
    callStartTime.current = 0; // Reset timer
    callInitiator.current = '';
    iceCandidatesQueue.current = []; // Reset ICE candidates queue

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
  }

  function toggleMic() {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        console.log(`Audio track enabled: ${track.enabled}`); // Log audio track status
      });
      setIsMicMuted(!isMicMuted);
    }
  }

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsCameraOff(!isCameraOff);
    }
  };

  const toggleScreenShare = async () => {
    const pc = peerConnection.current;
    if (!pc) return;

    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false // System audio sharing is complex, sticking to video only for now
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Find existing video sender
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          // Replace camera track with screen track
          await sender.replaceTrack(screenTrack);
          setIsScreenSharing(true);
          setIsCameraOff(false); // Screen is visible, so "camera" is effectively on
        }

        // Handle when user stops sharing via browser UI
        screenTrack.onended = async () => {
          if (localStream) {
            const cameraTrack = localStream.getVideoTracks()[0];
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender && cameraTrack) {
              await sender.replaceTrack(cameraTrack);
            }
          }
          setIsScreenSharing(false);
          // Restore camera state
          if (localStream && isCameraOff) {
            localStream.getVideoTracks().forEach(track => track.enabled = false);
          }
        };

      } else {
        // Stop screen sharing manually
        if (localStream) {
          const cameraTrack = localStream.getVideoTracks()[0];
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && cameraTrack) {
            await sender.replaceTrack(cameraTrack);
          }
          // Stop screen tracks
          const senders = pc.getSenders();
          senders.forEach(s => {
            if (s.track?.label.includes('screen')) {
              s.track.stop();
            }
          });
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('[ScreenShare] Error toggling:', error);
      setIsScreenSharing(false);
    }
  };

  return (
    <CallContext.Provider
      value={{
        isInCall: !!activeCall,
        incomingCall,
        activeCall,
        localStream,
        remoteStream,
        connectionQuality,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        isMicMuted,
        isCameraOff,
        isScreenSharing,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
