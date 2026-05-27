import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.html',
  styleUrl: './message-input.css'
})
export class MessageInput {
  @Output() send = new EventEmitter<string>();

  content = '';

  onSend() {
    if (this.content.trim()) {
      this.send.emit(this.content);
      this.content = '';
    }
  }
}
