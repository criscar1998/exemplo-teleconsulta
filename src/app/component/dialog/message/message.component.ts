import { Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogModule,
  MAT_DIALOG_DATA,
} from "@angular/material/dialog";

@Component({
  selector: "app-message",
  standalone: true,
  imports: [MatDialogTitle, MatDialogContent, MatButtonModule, MatDialogModule],
  templateUrl: "./message.component.html",
  styleUrl: "./message.component.scss",
})
export class MessageComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      message: string;
    }
  ) {}

  
}
