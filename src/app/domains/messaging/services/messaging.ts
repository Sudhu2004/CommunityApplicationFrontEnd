import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Api } from '../../../core/services/api';
import { UserService } from '../../../core/services/user';
import { Auth } from '../../../core/services/auth';
import {
  MessageDTO,
  CreateMessageRequest,
  PageMessageDTO,
} from '../models/message';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  private api = inject(Api);
  private userService = inject(UserService);
  private auth = inject(Auth);

  private loadingSignal = signal(false);
  private errorSignal = signal<string | null>(null);
  private stompClient: Client | null = null;
  private connectionStatus = signal<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('DISCONNECTED');

  isLoading = this.loadingSignal.asReadonly();
  error = this.errorSignal.asReadonly();
  status = this.connectionStatus.asReadonly();

  private begin() {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
  }

  private handleErr(msg: string) {
    return (error: any) => {
      console.error(`MessagingService Error [${msg}]:`, error);
      this.errorSignal.set(error.message || msg);
      this.loadingSignal.set(false);
      throw error;
    };
  }

  private done() {
    this.loadingSignal.set(false);
  }

  /**
   * Initialize and Connect to WebSocket
   */
  async connect(): Promise<void> {
    if (this.stompClient?.connected) return;
    if (this.connectionStatus() === 'CONNECTING') {
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (this.stompClient?.connected) {
            clearInterval(check);
            resolve();
          } else if (this.connectionStatus() === 'DISCONNECTED') {
            clearInterval(check);
            reject(new Error('Connection failed'));
          }
        }, 100);
      });
    }

    this.connectionStatus.set('CONNECTING');

    try {
      const userCode = await firstValueFrom(this.userService.getUserCode());
      const token = this.auth.getToken();

      if (!token || !userCode) {
        throw new Error('Authentication required for WebSocket connection');
      }

      console.log('STOMP: Connecting with userCode:', userCode);

      return new Promise((resolve, reject) => {
        this.stompClient = new Client({
          webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
          connectHeaders: {
            Authorization: `Bearer ${token}`,
            userCode: userCode,
          },
          debug: (msg) => {
            console.log('STOMP DEBUG:', msg);
          },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        });

        this.stompClient.onConnect = () => {
          console.log('STOMP: Connected');
          this.connectionStatus.set('CONNECTED');
          resolve();
        };

        this.stompClient.onStompError = (frame) => {
          console.error('STOMP: Error', frame.headers['message']);
          this.connectionStatus.set('DISCONNECTED');
          this.errorSignal.set(frame.headers['message']);
          reject(new Error(frame.headers['message']));
        };

        this.stompClient.onWebSocketClose = () => {
          this.connectionStatus.set('DISCONNECTED');
        };

        this.stompClient.activate();
      });
    } catch (err) {
      this.connectionStatus.set('DISCONNECTED');
      this.errorSignal.set(err instanceof Error ? err.message : 'Connection error');
      throw err;
    }
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      this.connectionStatus.set('DISCONNECTED');
    }
  }

  /**
   * Subscribe to messages and deletions
   */
  subscribe(
    topic: string, 
    onMessage: (msg: MessageDTO) => void,
    onDelete?: (messageId: string) => void
  ): StompSubscription[] {
    if (!this.stompClient?.connected) return [];

    console.log('STOMP: Subscribing to', topic);
    const subs: StompSubscription[] = [];
    
    subs.push(this.stompClient.subscribe(topic, (message: IMessage) => {
      console.log('STOMP: Message received', message.body);
      onMessage(JSON.parse(message.body));
    }));

    if (onDelete) {
      subs.push(this.stompClient.subscribe(`${topic}/deleted`, (message: IMessage) => {
        onDelete(message.body);
      }));
    }

    return subs;
  }

  /**
   * Send message via WebSocket
   */
  sendMessageWS(destination: string, payload: any) {
    if (!this.stompClient?.connected) throw new Error('Not connected');

    const token = this.auth.getToken();
    const userCode = this.auth.getCurrentUserData()?.userCode;

    // According to requirements, codes are extracted from URL, so we send clean payload
    // But we include headers for every frame to ensure security context is maintained
    this.stompClient.publish({
      destination,
      body: JSON.stringify(payload),
      headers: {
        Authorization: `Bearer ${token}`,
        userCode: userCode || ''
      }
    });
  }

  /**
   * REST API Methods
   */

  /**
   * Record a system activity as a special message
   */
  recordActivity(message: string, codes: { communityCode?: string, eventCode?: string, groupCode?: string }): Observable<MessageDTO> {
    const payload: CreateMessageRequest = {
      type: 'SYSTEM_ACTIVITY',
      content: message,
      mediaList: [],
      ...codes
    };
    return this.sendMessage(payload);
  }

  sendMessage(payload: CreateMessageRequest): Observable<MessageDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.post<MessageDTO>('/api/messages', payload, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Send failed'))
    );
  }

  getMessagesByEvent(eventCode: string, page = 0, size = 50): Observable<PageMessageDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<PageMessageDTO>(`/api/messages/event/${eventCode}`, { page, size }, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Event history failed'))
    );
  }

  getMessagesByCommunity(communityCode: string, page = 0, size = 50): Observable<PageMessageDTO> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<PageMessageDTO>(`/api/messages/community/${communityCode}`, { page, size }, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Community history failed'))
    );
  }

  getMessagesByGroup(groupCode: string): Observable<MessageDTO[]> {
    this.begin();
    return this.userService.getUserCode().pipe(
      switchMap(userCode => this.api.get<MessageDTO[]>(`/api/messages/group/${groupCode}/all`, null, { userCode })),
      tap(() => this.done()),
      catchError(this.handleErr('Group history failed'))
    );
  }
}
