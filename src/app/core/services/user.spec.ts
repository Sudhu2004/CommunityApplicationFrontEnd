import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { UserService, User } from './user';
import { Api } from './api';
import { Auth } from './auth';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { environment } from '../../../environment/environment.prod';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;
  let authMock: any;
  const baseUrl = environment.apiUrl; // Ensure base URL is consistent with Api service

  beforeEach(() => {
    authMock = {
      getCurrentUserData: vi.fn(),
      getUserEmail: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        Api,
        { provide: Auth, useValue: authMock }
      ],
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockUser: User = {
    userCode: 'U123',
    email: 'test@example.com',
    name: 'Test User',
    active: true,
    createdAt: new Date().toISOString()
  };

  describe('getUserByCode', () => {
    it('should fetch user by code', () => {
      service.getUserByCode('U123').subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/user/U123`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });
  });

  describe('getUserByEmail', () => {
    it('should fetch user by email', () => {
      service.getUserByEmail('test@example.com').subscribe((user) => {
        expect(user).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/user/email/test@example.com`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUser);
    });
  });

  describe('updateUser', () => {
    it('should update user profile', () => {
      const updateData = { name: 'New Name' };
      const updatedUser = { ...mockUser, name: 'New Name' };

      service.updateUser('U123', updateData).subscribe((user) => {
        expect(user.name).toBe('New Name');
      });

      const req = httpMock.expectOne(`${baseUrl}/api/user/U123`);
      expect(req.request.method).toBe('PUT');
      req.flush(updatedUser);
    });
  });

  describe('getAllUsers', () => {
    it('should fetch all users', () => {
      const mockUsers = [mockUser];
      service.getAllUsers().subscribe((users) => {
        expect(users.length).toBe(1);
        expect(users[0]).toEqual(mockUser);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/user/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockUsers);
    });
  });

  describe('getUserCode', () => {
    it('should return code from auth data if available', () => {
      authMock.getCurrentUserData.mockReturnValue({ userCode: 'U123' });
      
      service.getUserCode().subscribe(code => {
        expect(code).toBe('U123');
      });
    });

    it('should fetch code by email if not in auth data', () => {
      authMock.getCurrentUserData.mockReturnValue({});
      authMock.getUserEmail.mockReturnValue('test@example.com');
      
      const res = { exists: true, shortCode: 'U123' };

      service.getUserCode().subscribe(code => {
        expect(code).toBe('U123');
      });

      const req = httpMock.expectOne(`${baseUrl}/api/user/userCodeByEmail?email=test@example.com`);
      req.flush(res);
    });
  });
});
