export interface User {
    id: string;
    player: HTMLElement;
    pc: RTCPeerConnection;
    dc: RTCDataChannel;
}