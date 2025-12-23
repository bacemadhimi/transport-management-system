import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserGroupForm } from './user-group-form';

describe('UserGroupForm', () => {
  let component: UserGroupForm;
  let fixture: ComponentFixture<UserGroupForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserGroupForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserGroupForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
