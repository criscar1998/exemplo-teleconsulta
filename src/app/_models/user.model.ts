export class userModel {
  id: string;
  player!: HTMLElement;
  pc!: RTCPeerConnection;
  dc!: RTCDataChannel;

  constructor(id: string) {
    this.id = id;
  }

  selfDestroy() {
    if (this.player) {
      this.player.remove();
    }

    if (this.pc) {
      this.pc.close();
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
    }
  }

  sendMessage(message: string) {
    if (this.dc) {
      this.dc.send(message);
    }
  }

}
