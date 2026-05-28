import { Component, Input, OnInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageBubble } from '../message-bubble/message-bubble';
import { MessageInput } from '../message-input/message-input';
import { MessagingService } from '../../services/messaging';
import { UserService } from '../../../../core/services/user';
import { ActivityService, Activity } from '../../../../core/services/activity';
import { MessageDTO, CreateMessageRequest, PageMessageDTO } from '../../models/message';
import { StompSubscription } from '@stomp/stompjs';
import { Observable, forkJoin, map, of, catchError } from 'rxjs';

@Component({
  selector: 'app-message-thread',
  standalone: true,
  imports: [CommonModule, MessageBubble, MessageInput],
  templateUrl: './message-thread.html',
  styleUrl: './message-thread.css'
})
export class MessageThread implements OnInit, OnDestroy {
  @Input() eventCode?: string;
  @Input() communityCode?: string;
  @Input() groupCode?: string;
  @Input() canChat = true;
  
  private messagingService = inject(MessagingService);
  private userService = inject(UserService);
  private activityService = inject(ActivityService);

  messages = signal<MessageDTO[]>([]);
  isLoading = signal(false);
  currentUserCode = signal<string | null>(null);
  private subscriptions: StompSubscription[] = [];

  constructor() {
    effect(() => {
      if (this.messagingService.status() === 'CONNECTED') {
        this.setupSubscription();
      }
    });
  }

  ngOnInit() {
    this.userService.getUserCode().subscribe(code => this.currentUserCode.set(code));
    this.loadHistoryAndConnect();
  }

  ngOnDestroy() {
    this.clearSubscriptions();
  }

  private clearSubscriptions() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }

  async loadHistoryAndConnect() {
    this.isLoading.set(true);
    
    let messagesObs$: Observable<MessageDTO[]>;
    let activitiesObs$: Observable<Activity[]> = of([]);

    if (this.eventCode) {
      messagesObs$ = this.messagingService.getMessagesByEvent(this.eventCode).pipe(map(res => res.content));
      activitiesObs$ = this.activityService.getActivitiesByReference(this.eventCode, 'EVENTS');
    } else if (this.communityCode) {
      messagesObs$ = this.messagingService.getMessagesByCommunity(this.communityCode).pipe(map(res => res.content));
      activitiesObs$ = this.activityService.getActivitiesByReference(this.communityCode, 'COMMUNITY');
    } else if (this.groupCode) {
      messagesObs$ = this.messagingService.getMessagesByGroup(this.groupCode);
      activitiesObs$ = this.activityService.getActivitiesByReference(this.groupCode, 'GROUP');
    } else {
      messagesObs$ = of([]);
    }

    forkJoin({
      messages: messagesObs$.pipe(
        catchError(err => {
          return of([] as MessageDTO[]);
        })
      ),
      activities: activitiesObs$.pipe(
        catchError(err => {
          return of([] as Activity[]);
        })
      )
    }).subscribe({
      next: ({ messages, activities }) => {
        const mappedActivities: MessageDTO[] = activities.map(a => ({
          id: a.id,
          content: a.message,
          type: 'SYSTEM_ACTIVITY',
          createdAt: a.createdAt,
          updatedAt: a.createdAt,
          userCode: '',
          senderName: 'System',
          senderProfilePhotoUrl: '',
          mediaList: []
        }));

        this.handleHistory([...messages, ...mappedActivities]);
      },
      error: (err) => {
        this.isLoading.set(false);
      }
    });

    try {
      await this.messagingService.connect();
    } catch (err) {
    }
  }

  private setupSubscription() {
    this.clearSubscriptions();
    
    let topic = '';
    if (this.eventCode) topic = `/topic/event/${this.eventCode}/messages`;
    else if (this.groupCode) topic = `/topic/group/${this.groupCode}/messages`;
    else if (this.communityCode) topic = `/topic/community/${this.communityCode}/messages`;

    if (topic) {
      this.subscriptions = this.messagingService.subscribe(
        topic,
        (msg) => this.handleIncomingMessage(msg),
        (deletedId) => this.handleDeletedMessage(deletedId)
      );
    }
  }

  private handleHistory(messages: MessageDTO[]) {
    const sorted = [...(messages || [])].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    this.messages.set(sorted);
    this.isLoading.set(false);
    this.scrollToBottom();
  }

  private handleIncomingMessage(msg: MessageDTO) {
    this.messages.update(list => {
      if (list.some(m => m.id === msg.id)) return list;
      return [...list, msg];
    });
    this.scrollToBottom();
  }

  private handleDeletedMessage(messageId: string) {
    this.messages.update(list => list.filter(m => m.id !== messageId));
  }

  onSendMessage(content: string) {
    if (!content.trim() || !this.canChat) return;
    
    const payload: CreateMessageRequest = {
      type: 'TEXT',
      content: content.trim(),
      mediaList: [],
      eventCode: this.eventCode,
      communityCode: this.communityCode,
      groupCode: this.groupCode
    };

    this.messagingService.sendMessage(payload).subscribe({
      next: () => {},
      error: (err) => {}
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.querySelector('.messages-viewport');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }
}
