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

  constructor(
    private ws: WebsocketService, 
    private route: Router,
    private _snackBar: MatSnackBar) {}

  public openRoom() {
    this.ws.onCreateRoom((data) => {
      if (data.status) {
        this.route.navigate(["/chamada", data.roomId]);
      }
    });

    this.ws.createRoom();
  }

  public joinRoom() {
    if (this.inputCode.length == 0) {
      alert("Informe um codigo de consulta");
      return;
    }

    this.ws.onJoinRoom((data) => {
      if (data.status) {
        this.route.navigate(["/chamada", data.roomId]);
      } else {
        alert(data.message);
      }
    });

    this.ws.joinRoom(this.inputCode);
  }
}
