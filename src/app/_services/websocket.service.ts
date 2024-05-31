import { HttpClient } from "@angular/common/http";
import { Injectable, OnInit } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Socket, io } from "socket.io-client";
import { environment } from "../../environments/environment";

@Injectable({
  providedIn: "root",
})
export class WebsocketService {
  private ws: Socket;
  private url = environment.wsHost;
  public connectionStatus: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  constructor() {
    this.ws = io(this.url);

    console.log(this.ws);

    this.ws.on("connect", () => {
      this.connectionStatus.next(true);
    });

    this.ws.on("disconnect", () => {
      this.connectionStatus.next(false);
    });
  }

  public isConnected() {
    return this.ws.connected;
  }

  public connectToRoute(): Socket {
    return this.ws.connect();
  }

  public closeConnection(): void {
    this.ws.disconnect();
  }

  public createRoom() {
    this.ws.emit("create room");
  }

  public onCreateRoom(callback: (data: any) => void) {
    this.ws.on("create room", callback);
  }

  public joinRoom(roomId: string) {
    this.ws.emit("join room", roomId);
  }

  public onJoinRoom(callback: (data: any) => void) {
    this.ws.on("join room", callback);
  }

  public iceCandidate(candidate: RTCIceCandidate, roomId: string) {
    this.ws.emit("ice candidate", candidate, roomId);
  }

  public onIceCandidate(callback: (data: any) => void){
    this.ws.on("ice candidate",callback);
  }

  public offer(offer: RTCSessionDescriptionInit, roomId: string) {
    this.ws.emit("offer", offer, roomId);
  }

  public onOffer(callback: (data: any) => void) {
    this.ws.on("offer", callback);
  }

  public answer(answer: RTCSessionDescriptionInit, roomId: string) {
    this.ws.emit("answer", answer, roomId);
  }

  public onAnswer(callback: (data: any) => void) {
    this.ws.on("answer", callback);
  }
}
