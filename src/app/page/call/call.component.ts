import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from "@angular/core";
import { WebsocketService } from "../../_services/websocket.service";
import { ActivatedRoute, Router } from "@angular/router";
import { CommonModule } from "@angular/common";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { User } from "../../_interfaces/user";
import { userModel } from "../../_models/user.model";
import { Socket } from "socket.io-client";
import { MatGridListModule } from "@angular/material/grid-list";

@Component({
  selector: "app-call",
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatGridListModule],
  templateUrl: "./call.component.html",
  styleUrls: ["./call.component.scss"],
})
export class CallComponent implements AfterViewInit, OnDestroy {
  public roomId!: string;
  private myStream!: MediaStream;
  private socket;

  public users = new Map();

  private rtcConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  //view child
  @ViewChild("remoteVideosContainer", { static: true })
  remoteVideosContainer!: ElementRef<HTMLDivElement>;
  @ViewChild("videoElementLocal")
  videoElementLocal!: ElementRef<HTMLVideoElement>;

  constructor(
    private ws: WebsocketService,
    private activeRoute: ActivatedRoute,
    private _snackBar: MatSnackBar,
    private renderer: Renderer2,
    private route: Router
  ) {
    this.roomId = this.activeRoute.snapshot.params["id"];
    this.socket = this.ws.connectToRoute();
  }

  ngAfterViewInit(): void {
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
        this.myStream = stream;
        this.joinRoom();
      })
      .catch((error) => {
        console.error("Error accessing media devices.", error);
        this.notification("Erro em acessar a webcam e microfone");
      });
  }

  private joinRoom() {
    if (this.roomId) {
      this.initConnection();
    }
  }

  private setupSocketEvents() {
    this.socket.on("disconnect-user", (data) => {
      var user = this.users.get(data.id);
      if (user) {
        this.notification("Participante saiu da sala");
        this.users.delete(data.id);
        user.selfDestroy();
      }
    });

    this.socket.on("call", (data) => {
      let user = new userModel(data.id);
      user.pc = this.createPeer(user);
      this.users.set(data.id, user);

      this.createOffer(user, this.socket);
    });

    this.socket.on("offer", (data) => {
      var user = this.users.get(data.id);
      if (user) {
        this.answerPeer(user, data.offer, this.socket);
      } else {
        let user = new userModel(data.id);
        user.pc = this.createPeer(user);
        this.users.set(data.id, user);
        this.answerPeer(user, data.offer, this.socket);
      }
    });

    this.socket.on("answer", (data) => {
      var user = this.users.get(data.id);
      if (user) {
        user.pc.setRemoteDescription(data.answer);
      }
    });

    this.socket.on("candidate", (data) => {
      var user = this.users.get(data.id);
      if (user) {
        user.pc.addIceCandidate(data.candidate);
      } else {
        let user = new userModel(data.id);
        user.pc = this.createPeer(user);
        user.pc.addIceCandidate(data.candidate);
        this.users.set(data.id, user);
      }
    });

    this.socket.on("leave room", (data) => {
      var user = this.users.get(data.id);
      if (data.id) {
        this.users.delete(data.id);
        user.selfDestroy();
        console.log("usuario saiu da chamada");
        this.notification("Participante saiu da chamada");
      }
    });

    this.socket.on("disconnect-user", (data) => {
      var user = this.users.get(data.id);
      if (user) {
        this.users.delete(data.id);
        user.selfDestroy();
        this.notification("Participante foi desconectado");
      }
    });
  }

  private initConnection() {
    this.socket.on("join room", (data) => {
      this.notification(data.message);
      if (!data.status) {
        this.route.navigate(["/"]);
        return;
      }
    });

    this.setupSocketEvents();
    this.socket.emit("join room", this.roomId);
  }

  private createOffer(user: User, socket: Socket) {
    user.dc = user.pc.createDataChannel("chat");
    this.setupDataChannel(user.dc);

    user.pc
      .createOffer()
      .then((offer) => {
        return user.pc.setLocalDescription(offer);
      })
      .then(() => {
        socket.emit("offer", {
          id: user.id,
          offer: user.pc.localDescription,
        });
      })
      .catch((error) => {
        console.error("Error creating offer:", error);
      });
  }

  private answerPeer(
    user: User,
    offer: RTCSessionDescriptionInit,
    socket: Socket
  ) {
    console.log(
      "Current signaling state before setRemoteDescription:",
      user.pc.signalingState
    );

    user.pc
      .setRemoteDescription(offer)
      .then(() => {
        console.log(
          "Current signaling state after setRemoteDescription:",
          user.pc.signalingState
        );

        console.log(
          "Creating answer. Current signaling state:",
          user.pc.signalingState
        );

        return user.pc.createAnswer();
      })
      .then((answer) => {
        console.log(
          "Current signaling state before setLocalDescription:",
          user.pc.signalingState
        );

        return user.pc.setLocalDescription(answer);
      })
      .then(() => {
        console.log(
          "Set local description. Current signaling state:",
          user.pc.signalingState
        );

        socket.emit("answer", {
          id: user.id,
          answer: user.pc.localDescription,
        });
      })
      .catch((error) => {
        console.error("Error answering peer:", error);
      });
  }

  private createPeer(user: User) {
    const pc = new RTCPeerConnection(this.rtcConfiguration);

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      this.socket.emit("candidate", {
        id: user.id,
        candidate: event.candidate,
      });
    };

    for (const track of this.myStream.getTracks()) {
      pc.addTrack(track, this.myStream);
    }

    pc.ontrack = (event) => {
      if (user.player) {
        return;
      }

      user.player = this.addVideoPlayer(event.streams[0], user);
    };

    pc.ondatachannel = (event) => {
      user.dc = event.channel;
      this.setupDataChannel(user.dc);
    };

    return pc;
  }

  private addVideoPlayer(stream: MediaStream, user: User) {
    const template = this.renderer.createElement("div");
    this.renderer.addClass(template, "card-video");

    const name = this.renderer.createElement("div");
    this.renderer.addClass(name, "name-user");
    const text = this.renderer.createText(user.id);
    

    const video = this.renderer.createElement("video");
    this.renderer.addClass(video, "responsive-video");
    video.autoplay = true;
    video.srcObject = stream;

    this.renderer.appendChild(template, video);
    this.renderer.appendChild(template, name);
    this.renderer.appendChild(name, text);
    this.renderer.appendChild(
      this.remoteVideosContainer.nativeElement,
      template
    );

    this.adjustGrid();

    return template;
  }

  private setupDataChannel(dataChannel: RTCDataChannel) {
    dataChannel.onopen = this.checkDataChannelState;
    dataChannel.onclose = this.checkDataChannelState;
    dataChannel.onmessage = (e) => {
      this.addMessage(e.data);
    };
  }

  private addMessage(e: any) {
    console.log(e);
  }

  private checkDataChannelState(event: Event) {
    console.log("WebRTC channel state is:", event.type);
  }

  public leaveRoom() {
    this.socket.emit("leave room", this.roomId);
    this.route.navigate(["/"]);
    this.notification("Você saiu da sala");
  }

  private notification(message: string) {
    this._snackBar.open(message, "Ok", {
      horizontalPosition: "left",
      duration: 2300,
    });
  }

  private adjustGrid() {
    const container = this.remoteVideosContainer.nativeElement;
    const numVideos = container.children.length;
    const numCols = Math.ceil(Math.sqrt(numVideos));
    const numRows = Math.ceil(numVideos / numCols);
    const containerHeight = container.clientHeight;

    const videoHeight = containerHeight / numRows;

    Array.from(container.children).forEach((child: any) => {
      child.style.height = `${videoHeight}px`;
    });

    if (numVideos === 1) {
      container.style.gridTemplateColumns = '1fr'; // Define apenas uma coluna
    }else {
      container.style.gridTemplateColumns = 'repeat(2, 1fr)';
    }
  }

  ngOnDestroy(): void {
    if (this.myStream) {
      this.myStream.getTracks().forEach((track) => track.stop());
    }
  }
}
