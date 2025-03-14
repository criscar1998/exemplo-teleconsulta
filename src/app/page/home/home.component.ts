import { Component, OnInit } from "@angular/core";
import { MatSelectModule } from "@angular/material/select";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatButtonModule } from "@angular/material/button";
import { WebsocketService } from "../../_services/websocket.service";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Socket } from "socket.io-client";
import { MatDialog } from "@angular/material/dialog";
import { ConfirmationComponent } from "../../component/dialog/confirmation/confirmation.component";
import { MessageComponent } from "../../component/dialog/message/message.component";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    CommonModule,
    FormsModule,
  ],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent {
  inputCode: string = "";
  private socket: Socket;

  constructor(
    private ws: WebsocketService,
    private route: Router,
    private _snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.socket = this.ws.connectToRoute();
  }

  public openRoom() {
    
    this.dialog.open(MessageComponent, {
      data: {
        title: "Aviso Importante",
        message:
        "Durante a teleconsulta, as <strong>câmeras serão ativadas automaticamente</strong> e não será possível desativá-las até o término da sessão. Por favor, esteja ciente antes de iniciar.",
      }
    })

    this.socket.on("create room", (data) => {
      if (data.status) {
        this.route.navigate(["/chamada", data.roomId]);
      }
    });

    this.socket.emit("create room");
  }
}
