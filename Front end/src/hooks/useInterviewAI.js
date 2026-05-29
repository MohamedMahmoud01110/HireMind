import { useRef, useState } from "react";
import InterviewSocket from "../services/InterviewSocket";

export default function useInterviewAI() {
  const videoRef = useRef(null);

  const streamRef = useRef(null);

  const wsRef = useRef(null);

  const videoIntervalRef = useRef(null);

  const [connected, setConnected] = useState(false);

  const [recording, setRecording] = useState(false);

  const [question, setQuestion] = useState("");

  const [transcript, setTranscript] = useState("");

  const [coaching, setCoaching] = useState([]);

  // ─────────────────────────────
  // ENABLE CAMERA
  // ─────────────────────────────

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      return true;
    } catch (err) {
      console.error(err);

      return false;
    }
  };

  // ─────────────────────────────
  // START SESSION
  // ─────────────────────────────

  const startInterview = async () => {
    const sessionId = Math.random().toString(36).slice(2);

    const socket = new InterviewSocket(sessionId);

    wsRef.current = socket;

    socket.connect(
      // onMessage
      (msg) => {
        // console.log(msg);

        switch (msg.type) {
          case "question":
            setQuestion(msg.data.question);

            break;

          case "coaching_update":
            setCoaching(msg.data.comments || []);

            break;

          case "transcript_update":
            setTranscript(msg.data.text || "");

            break;

          default:
            break;
        }
      },

      // onOpen
      () => {
        setConnected(true);

        setRecording(true);

        socket.send({
          type: "start_session",
        });

        startVideoStreaming();
      },

      // onClose
      () => {
        setConnected(false);

        setRecording(false);
      },
    );
  };

  // ─────────────────────────────
  // VIDEO STREAMING
  // ─────────────────────────────

  const startVideoStreaming = () => {
    const canvas = document.createElement("canvas");

    const ctx = canvas.getContext("2d");

    videoIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return;

      if (!wsRef.current) return;

      canvas.width = 240;

      canvas.height = 180;

      ctx.drawImage(videoRef.current, 0, 0, 240, 180);

      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          const buffer = await blob.arrayBuffer();

          const bytes = new Uint8Array(buffer);

          let binary = "";

          bytes.forEach((b) => {
            binary += String.fromCharCode(b);
          });

          const base64 = btoa(binary);

          wsRef.current.send({
            type: "video_frame",

            frame: base64,
          });
        },
        "image/jpeg",
        0.45,
      );
    }, 1000);
  };

  // ─────────────────────────────
  // STOP SESSION
  // ─────────────────────────────

  const stopInterview = () => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (wsRef.current) {
      wsRef.current.send({
        type: "end_session",
      });

      wsRef.current.close();
    }

    setRecording(false);

    setConnected(false);
  };

  return {
    videoRef,

    connected,

    recording,

    question,

    transcript,

    coaching,

    enableCamera,

    startInterview,

    stopInterview,
  };
}
