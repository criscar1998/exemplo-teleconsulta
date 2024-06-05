import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogContent, MatDialogModule, MatDialogTitle } from '@angular/material/dialog';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatButtonModule,
    MatDialogModule],
  templateUrl: './confirmation.component.html',
  styles: ``
})
export class ConfirmationComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { title: string, message: string, textButtonAccept?:string, textButtonCancel?:string }) {

    if (!this.data.textButtonAccept) {
      this.data.textButtonAccept = 'Confirmar';
    }
    if (!this.data.textButtonCancel) {
      this.data.textButtonCancel = 'Cancelar';
    }

  }
}
