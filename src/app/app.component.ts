import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { WebsocketService } from "./_services/websocket.service";
import { CommonModule } from "@angular/common";
import { AwaitingConnectionComponent } from "./component/awaiting-connection/awaiting-connection.component";

@Component({
    selector: "app-root",
    standalone: true,
    templateUrl: "./app.component.html",
    styles: [],
    providers: [WebsocketService],
    imports: [RouterOutlet, CommonModule, AwaitingConnectionComponent]
})
export class AppComponent {
  title = "NovaTeleconsulta";
  public connectionStatusWs: boolean = false;

  constructor(private ws: WebsocketService) {
    this.ws.connectionStatus.subscribe(status =>{
      this.connectionStatusWs = status;
    })
  }
}
