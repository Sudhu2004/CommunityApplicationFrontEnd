import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  /**
   * Perform a POST request
   */
  post<T>(endpoint: string, body: unknown, headers?: Record<string, string>): Observable<T> {
    const httpHeaders = headers ? new HttpHeaders(headers) : undefined;
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, { headers: httpHeaders }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Perform a PUT request
   */
  put<T>(endpoint: string, body: unknown, headers?: Record<string, string>): Observable<T> {
    const httpHeaders = headers ? new HttpHeaders(headers) : undefined;
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, { headers: httpHeaders }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Perform a DELETE request
   */
  delete<T>(endpoint: string, headers?: Record<string, string>): Observable<T> {
    const httpHeaders = headers ? new HttpHeaders(headers) : undefined;
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, { headers: httpHeaders }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Perform a PATCH request
   */
  patch<T>(endpoint: string, body: unknown, options?: { headers?: Record<string, string>, params?: any }): Observable<T> {
    const httpHeaders = options?.headers ? new HttpHeaders(options.headers) : undefined;
    let httpParams = new HttpParams();

    if (options?.params) {
      Object.keys(options.params).forEach(key => {
        httpParams = httpParams.set(key, options.params[key]);
      });
    }

    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body, { headers: httpHeaders, params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse) {
    const message =
      error?.error?.message ||   // backend message
      error?.message ||
      'Something went wrong';

    return throwError(() => new Error(message));
  }

  get<T>(endpoint: string, params?: any, headers?: Record<string, string>): Observable<T> {
    const httpHeaders = headers ? new HttpHeaders(headers) : undefined;
    let httpParams = new HttpParams();

    if (params) {
      Object.keys(params).forEach(key => {
        httpParams = httpParams.set(key, params[key]);
      });
    }

    return this.http.get<T>(`${this.baseUrl}${endpoint}`, { params: httpParams, headers: httpHeaders }).pipe(
      catchError(this.handleError)
    );
  }
}
