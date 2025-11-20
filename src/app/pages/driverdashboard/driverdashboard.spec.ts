import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Driverdashboard } from './driverdashboard';

describe('Driverdashboard', () => {
  let component: Driverdashboard;
  let fixture: ComponentFixture<Driverdashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Driverdashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Driverdashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
