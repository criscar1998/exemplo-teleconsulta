import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { WebsocketService } from "../../_services/websocket.service";
import { ActivatedRoute } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
  selector: "app-call",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./call.component.html",
  styleUrls: ["./call.component.scss"],
})
export class CallComponent implements OnInit, OnDestroy {
  public roomId!: string;
  private pc!: RTCPeerConnection;
  private localStream!: MediaStream;
  private remoteStream!: MediaStream;
  @ViewChild("videoElementRemote")
  videoElementRemote!: ElementRef<HTMLVideoElement>;
  @ViewChild("videoElementLocal")
  videoElementLocal!: ElementRef<HTMLVideoElement>;
  private iceServers = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  constructor(
    private ws: WebsocketService,
    private route: ActivatedRoute,
    private _snackBar: MatSnackBar
  ) {
    this.roomId = this.route.snapshot.params["id"];
    console.log(this.roomId);
  }

  ngOnInit(): void {
    this.receiveOffer();
    this.receiveAnswer();
    this.receiveIceCandidate();
    this.startLocalStream();
  }

  private startLocalStream() {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        this.videoElementLocal.nativeElement.srcObject = stream;
        this.localStream = stream;
        this.createPeerConnection();
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
      });
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection(this.iceServers);
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.ws.iceCandidate(event.candidate, this.roomId);
      }
    };

    this.pc.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.videoElementRemote.nativeElement.srcObject = this.remoteStream;
      }
      this.remoteStream.addTrack(event.track);
    };

    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream);
    });

    this.createOffer();
  }

  private async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.ws.offer(offer, this.roomId);
  }

  private receiveOffer() {
    this.ws.onOffer(async (offer) => {
      if (!this.pc) {
        this.createPeerConnection();
      }
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.ws.answer(answer, this.roomId);
    });
  }

  private receiveAnswer() {
    this.ws.onAnswer(async (answer) => {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    });
  }

  private receiveIceCandidate() {
    this.ws.onIceCandidate(async (candidate) => {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding received ice candidate", e);
      }
    });
  }

  ngOnDestroy(): void {
    //this.pc.close();
  }
}
