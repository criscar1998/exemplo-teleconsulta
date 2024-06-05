import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
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
import { stunServers } from "../../_utils/iceServers";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MessageComponent } from "../../component/dialog/message/message.component";
import { ConfirmationComponent } from "../../component/dialog/confirmation/confirmation.component";

@Component({
  selector: "app-call",
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatDialogModule,
  ],
  templateUrl: "./call.component.html",
  styleUrls: ["./call.component.scss"],
})
export class CallComponent implements AfterViewInit, OnDestroy {
  public roomId!: string;
  private myStream!: MediaStream;
  private socket;

  private attemptsCamera: number = 0;
  public isMuted: boolean = false;
  public users = new Map();

  private rtcConfiguration: RTCConfiguration = {
    iceServers: stunServers,
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
    private route: Router,
    private dialog: MatDialog
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
        if (error.name === "NotAllowedError") {
          if (this.attemptsCamera < 2) {
            this.dialogCameraNotAllow();
            this.attemptsCamera++;
          } else {
            this.dialogMessageHelpEnableCamera();
          }
        }
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
        this.notification("Participante foi desconectado");
        this.users.delete(data.id);
        user.selfDestroy();
        this.adjustGrid();
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
        if (user.pc.signalingState == "stable") {
          user.pc.addIceCandidate(data.candidate);
        }
      } else {
        let user = new userModel(data.id);
        user.pc = this.createPeer(user);
        user.pc.addIceCandidate(data.candidate);
        this.users.set(data.id, user);
      }
    });

    this.socket.on("leave room", (data) => {
      var user = this.users.get(data.id);
      if (user) {
        user.selfDestroy();
        this.users.delete(data.id);
        console.log("usuario saiu da chamada");
        this.notification("Participante saiu da chamada");
        this.adjustGrid();
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
      `user:${user.id},Current signaling state before setRemoteDescription:`,
      user.pc.signalingState
    );

    if (user.pc.signalingState !== "stable") {
      return;
    }

    user.pc
      .setRemoteDescription(offer)
      .then(() => {
        return user.pc.createAnswer();
      })
      .then((answer) => {
        return user.pc.setLocalDescription(answer);
      })
      .then(() => {
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

    pc.oniceconnectionstatechange = (event) => {
      console.log(user.pc.iceConnectionState); //debug
    };

    pc.ondatachannel = (event) => {
      user.dc = event.channel;
      this.setupDataChannel(user.dc); //debug
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
    this.renderer.setAttribute(video, "playsinline", "true");

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
    this.users.forEach((user) => {
      user.selfDestroy();
    });
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
      container.style.gridTemplateColumns = "1fr"; // Define apenas uma coluna
    } else {
      container.style.gridTemplateColumns = "repeat(2, 1fr)";
    }

    console.log("atualizando grid, video remotos:", numVideos);
  }

  private dialogCameraNotAllow() {
    let dialogRef = this.dialog.open(ConfirmationComponent, {
      data: {
        textButtonAccept: "Tentar Novamente",
        title: "Permissão de Câmera Necessária",
        message:
          "Você não permitiu o acesso à câmera. Para participar da sala, é necessário conceder a permissão de uso da câmera.",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.startLocalStream();
      } else {
        this.route.navigate(["/"]);
      }
    });
  }

  private dialogMessageHelpEnableCamera() {
    let dialogRef = this.dialog.open(ConfirmationComponent, {
      data: {
        textButtonAccept: "Recarregar página",
        textButtonCancel: "Não quero fazer isso",
        title: "Permissão de Câmera Necessária",
        message:
          "Você negou o acesso à câmera várias vezes. Para conceder a permissão, siga as instruções abaixo:<br><br>" +
          "1. Abra as configurações do seu navegador.<br>" +
          "2. Navegue até a seção de privacidade e segurança.<br>" +
          "3. Encontre a seção de configurações de sites ou permissões de sites.<br>" +
          "4. Procure a opção para câmera e encontre o nosso site na lista.<br>" +
          '5. Altere a permissão da câmera para "Permitir".<br>' +
          "6. Recarregue a página e tente novamente.",
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        window.location.reload();
      } else {
        this.route.navigate(["/"]);
      }
    });
  }

  public muted() {
    const audioTrack = this.myStream.getAudioTracks()[0];
    if (audioTrack) {
      if (this.isMuted) {
        audioTrack.enabled = true;
        this.isMuted = false;
        this.notification("Você reativou o microfone");
        
      } else {
        audioTrack.enabled = false;
        this.isMuted = true;
        this.notification("Você desativou o microfone");
        
      }
    }
  }

  ngOnDestroy(): void {
    if (this.myStream) {
      this.myStream.getTracks().forEach((track) => track.stop());
    }
  }
}
