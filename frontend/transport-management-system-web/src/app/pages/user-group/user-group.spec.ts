import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserGroup } from './user-group';

describe('UserGroup', () => {
  let component: UserGroup;
  let fixture: ComponentFixture<UserGroup>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserGroup]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserGroup);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
