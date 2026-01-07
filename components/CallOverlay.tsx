
import React, { useEffect, useRef, useState } from 'react';
import { useCall } from '../context/CallContext';
import { DBService } from '../services/database';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, PhoneIncoming } from 'lucide-react';
import { User } from '../types';

const CallOverlay: React.FC = () => {
  const { 
    incomingCall, 
    activeCall, 
    acceptCall, 
    rejectCall, 
    endCall, 
    localStream, 
    remoteStream,
    toggleMic,
    toggleCamera,
    isMicMuted,
    isCameraOff
  } = useCall();

  const [caller, setCaller] = useState<User | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
      if (incomingCall) {
          DBService.getUserById(incomingCall.callerId).then(u => setCaller(u || null));
      } else {
          setCaller(null);
      }
  }, [incomingCall]);

  useEffect(() => {
      if (activeCall) {
          DBService.getUserById(activeCall.userId).then(u => setActiveUser(u || null));
      } else {
          setActiveUser(null);
      }
  }, [activeCall]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall]);

  if (incomingCall && caller) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="relative mb-6">
             <div className="absolute inset-0 bg-snuggle-400 rounded-full animate-ping opacity-20"></div>
             <img src={caller.avatar} alt={caller.username} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg relative z-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{caller.fullName}</h3>
          <p className="text-gray-500 mb-8">Incoming {incomingCall.type} call...</p>
          
          <div className="flex items-center space-x-12">
            <button 
              onClick={rejectCall}
              className="flex flex-col items-center space-y-2 group"
            >
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                <PhoneOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-500">Decline</span>
            </button>

            <button 
              onClick={acceptCall}
              className="flex flex-col items-center space-y-2 group"
            >
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all duration-300 shadow-lg scale-110">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-gray-500">Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeCall) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
        {/* Main Video (Remote) */}
        <div className="flex-1 relative overflow-hidden">
          {remoteStream ? (
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          ) : (
             <div className="w-full h-full flex items-center justify-center flex-col">
                <img src={activeUser?.avatar} className="w-32 h-32 rounded-full border-4 border-gray-700 opacity-50 mb-4" />
                <p className="text-white/50 animate-pulse">Connecting...</p>
             </div>
          )}

          {/* Local Video (PIP) */}
          {activeCall.type === 'video' && (
            <div className="absolute top-4 right-4 w-32 h-48 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-white/20">
               <video 
                 ref={localVideoRef} 
                 autoPlay 
                 playsInline 
                 muted 
                 className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
               />
               {isCameraOff && (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white/30">
                    <VideoOff className="w-8 h-8" />
                  </div>
               )}
            </div>
          )}
          
          {/* Header Info */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
             <h3 className="text-white font-bold text-center text-lg drop-shadow-md">{activeUser?.fullName}</h3>
             <p className="text-white/70 text-center text-xs">{activeCall.type === 'video' ? 'Video Call' : 'Audio Call'}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-900/90 backdrop-blur p-6 pb-8">
           <div className="flex items-center justify-center space-x-6">
              <button 
                onClick={toggleMic}
                className={`p-4 rounded-full transition-all ${isMicMuted ? 'bg-white text-gray-900' : 'bg-gray-700/50 text-white hover:bg-gray-700'}`}
              >
                {isMicMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {activeCall.type === 'video' && (
                <button 
                  onClick={toggleCamera}
                  className={`p-4 rounded-full transition-all ${isCameraOff ? 'bg-white text-gray-900' : 'bg-gray-700/50 text-white hover:bg-gray-700'}`}
                >
                  {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}

              <button 
                onClick={endCall}
                className="p-4 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-lg transform hover:scale-105 transition-all"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
           </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CallOverlay;
