import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CommunityDTO } from '../../models/community';

@Component({
  selector: 'app-community-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './community-card.html',
  styleUrl: './community-card.css'
})
export class CommunityCard {
  @Input({ required: true }) community!: CommunityDTO;
  /** Emitted when the user clicks Join on a community they haven't joined yet */
  @Output() join = new EventEmitter<CommunityDTO>();

  onJoin(event: Event) {
    event.stopPropagation();
    this.join.emit(this.community);
  }
}
