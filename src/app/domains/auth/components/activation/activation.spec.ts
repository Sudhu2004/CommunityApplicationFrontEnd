import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Activation } from './activation';

describe('Activation', () => {
  let component: Activation;
  let fixture: ComponentFixture<Activation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Activation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Activation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
