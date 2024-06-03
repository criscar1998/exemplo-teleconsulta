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
}
