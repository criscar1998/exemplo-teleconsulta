import { Component } from "@angular/core";
import {MatProgressBarModule} from '@angular/material/progress-bar';

@Component({
  selector: "app-awaiting-connection",
  standalone: true,
  imports: [MatProgressBarModule],
  templateUrl: "./awaiting-connection.component.html",
  styleUrl: "./awaiting-connection.component.scss"
})
export class AwaitingConnectionComponent {}
