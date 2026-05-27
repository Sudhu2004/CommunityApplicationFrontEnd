import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { GroupDTO } from '../../models/group';

@Component({
  selector: 'app-group-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './group-card.html',
  styleUrl: './group-card.css'
})
export class GroupCard {
  @Input({ required: true }) group!: GroupDTO;
}
