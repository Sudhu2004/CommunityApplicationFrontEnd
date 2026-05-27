import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageDTO } from '../../models/message';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-bubble.html',
  styleUrl: './message-bubble.css'
})
export class MessageBubble {
  @Input({ required: true }) message!: MessageDTO;
  @Input() isOwn = false;
}
