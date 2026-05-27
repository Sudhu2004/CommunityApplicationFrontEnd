import { Injectable, signal } from '@angular/core';

export interface Breadcrumb {
  label: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private _breadcrumbs = signal<Breadcrumb[]>([]);
  breadcrumbs = this._breadcrumbs.asReadonly();

  setBreadcrumbs(breadcrumbs: Breadcrumb[]) {
    this._breadcrumbs.set(breadcrumbs);
  }

  addBreadcrumb(breadcrumb: Breadcrumb) {
    this._breadcrumbs.update(current => [...current, breadcrumb]);
  }

  clear() {
    this._breadcrumbs.set([]);
  }
}
