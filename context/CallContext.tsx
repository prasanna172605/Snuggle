
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, SignalingMessage, CallType } from '../types';
import { DBService } from '../services/database';

interface CallContextType {
  isInCall: boolean;
  incomingCall: { callerId: string; type: CallType } | null;
  activeCall: { userId: string; type: CallType } | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  startCall: (receiverId: string, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => void;
  isMicMuted: boolean;
  isCameraOff: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode; currentUser: User | null }> = ({ children, currentUser }) => {
  const [incomingCall, setIncomingCall] = useState<{ callerId: string; type: CallType } | null>(null);
  const [activeCall, setActiveCall] = useState<{ userId: string; type: CallType } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
  };

  useEffect(() => {
    if (!currentUser) return;

    const handleSignaling = (e: Event) => {
      const storedEvent = localStorage.getItem('snuggle_event_signaling');
      if (!storedEvent) return;

      const data: SignalingMessage = JSON.parse(storedEvent);
      // Ignore old events
      if (Date.now() - data.timestamp > 5000) return;

      // Handle events destined for us
      if (data.receiverId === currentUser.id) {
        handleSignalMessage(data);
      }
    };

    window.addEventListener('local-storage-signaling', handleSignaling);
    window.addEventListener('storage', handleSignaling);

    return () => {
      window.removeEventListener('local-storage-signaling', handleSignaling);
      window.removeEventListener('storage', handleSignaling);
    };
  }, [currentUser, activeCall]);

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
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    peerConnection.current = pc;
    return pc;
  };

  const startCall = async (receiverId: string, type: CallType) => {
    if (!currentUser) return;
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
    } catch (err) {
      console.error('Error starting call:', err);
      alert('Could not access camera/microphone');
    }
  };

  const handleSignalMessage = async (data: SignalingMessage) => {
    if (!currentUser) return;

    if (data.type === 'offer') {
      if (activeCall) {
        // Busy
        DBService.sendSignal({
          type: 'busy',
          senderId: currentUser.id,
          receiverId: data.senderId,
          timestamp: Date.now(),
        });
        return;
      }
      setIncomingCall({ callerId: data.senderId, type: data.callType || 'audio' });
      // We store the remote SDP to set it when accepted
      (window as any).pendingOffer = data.sdp; 
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
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setIsMicMuted(false);
    setIsCameraOff(false);
  };

  const toggleMic = () => {
    if (localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
        setIsMicMuted(!isMicMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
        localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        setIsCameraOff(!isCameraOff);
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
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMic,
        toggleCamera,
        isMicMuted,
        isCameraOff
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
