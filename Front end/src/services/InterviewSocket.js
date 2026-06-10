class InterviewSocket {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.socket = null;

    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;

    this.isManualClose = false;
  }

  connect(onMessage, onOpen, onClose) {
    this.isManualClose = false;

    const url = `ws://localhost:3000/ws/${this.sessionId}`;
    this.socket = new WebSocket(url);
    // connect to Ai
    this.socket.onopen = () => {
      console.log("AI Connected");

      this.reconnectAttempts = 0;
      onOpen?.();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage?.(data);
      } catch (err) {
        console.error("WS Parse Error", err);
      }
    };

    this.socket.onclose = () => {
      console.log("AI Disconnected");
      onClose?.();

      if (!this.isManualClose) {
        this.handleReconnect(onMessage, onOpen, onClose);
      }
    };

    this.socket.onerror = (err) => {
      console.error("WebSocket Error", err);
    };
  }

  handleReconnect(onMessage, onOpen, onClose) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnect attempts reached");
      return;
    }

    this.reconnectAttempts++;

    setTimeout(() => {
      console.log(`Reconnecting... (${this.reconnectAttempts})`);

      this.connect(onMessage, onOpen, onClose);
    }, this.reconnectDelay);
  }

  send(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  close() {
    this.isManualClose = true;

    if (this.socket) {
      this.socket.close();
    }
  }
}

export default InterviewSocket;
