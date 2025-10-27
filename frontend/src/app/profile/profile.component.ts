import { Component, inject, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { UsersService, UserProfile } from './users.service';

interface EmailFormGroup {
  id: FormControl<string | null>;
  email: FormControl<string>;
  emailType: FormControl<string>;
  isPrimary: FormControl<boolean>;
}

interface PhoneFormGroup {
  id: FormControl<string | null>;
  phoneNumber: FormControl<string>;
  phoneType: FormControl<string>;
  isPrimary: FormControl<boolean>;
}

interface AddressFormGroup {
  id: FormControl<string | null>;
  streetLine1: FormControl<string>;
  streetLine2: FormControl<string>;
  city: FormControl<string>;
  stateProvince: FormControl<string>;
  postalCode: FormControl<string>;
  country: FormControl<string>;
  addressType: FormControl<string>;
  isPrimary: FormControl<boolean>;
}

interface ProfileForm {
  firstName: FormControl<string>;
  middleName: FormControl<string>;
  lastName: FormControl<string>;
  emails: FormArray<FormGroup<EmailFormGroup>>;
  phones: FormArray<FormGroup<PhoneFormGroup>>;
  addresses: FormArray<FormGroup<AddressFormGroup>>;
}

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly viewingUserId = signal<string | null>(null);
  protected readonly viewingUserProfile = signal<UserProfile | null>(null);
  protected readonly selectedUserState = signal<string>('active');
  protected readonly showEmails = signal(true);
  protected readonly showPhones = signal(true);
  protected readonly showAddresses = signal(true);

  protected readonly profileForm = new FormGroup<ProfileForm>({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)] }),
    middleName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(100)] }),
    emails: new FormArray<FormGroup<EmailFormGroup>>([]),
    phones: new FormArray<FormGroup<PhoneFormGroup>>([]),
    addresses: new FormArray<FormGroup<AddressFormGroup>>([])
  });

  async ngOnInit(): Promise<void> {
    // Check if we're viewing another user's profile (admin feature)
    this.route.params.subscribe(async (params) => {
      const userId = params['userId'];
      if (userId) {
        this.viewingUserId.set(userId);
        await this.loadProfile(userId);
      } else {
        await this.loadProfile();
      }
    });
  }

  protected isAdmin(): boolean {
    return this.authService.currentUser()?.state === 'admin';
  }

  protected isViewingOtherUser(): boolean {
    return this.viewingUserId() !== null && this.viewingUserId() !== this.authService.currentUser()?.id;
  }

  private async loadProfile(userId?: string): Promise<void> {
    const targetUserId = userId || this.authService.currentUser()?.id;
    if (!targetUserId) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading.set(true);
    try {
      const profile: UserProfile = await this.usersService.getProfile(targetUserId);
      
      if (userId) {
        this.viewingUserProfile.set(profile);
        this.selectedUserState.set(profile.state);
      }
      
      // Populate basic fields
      this.profileForm.patchValue({
        firstName: profile.firstName,
        middleName: profile.middleName || '',
        lastName: profile.lastName
      });

      // Populate emails
      if (profile.emails && profile.emails.length > 0) {
        profile.emails.forEach((email: any) => {
          this.emails.push(this.createEmailFormGroup(email));
        });
      } else {
        this.addEmail();
      }

      // Populate phones
      if (profile.phones && profile.phones.length > 0) {
        profile.phones.forEach((phone: any) => {
          this.phones.push(this.createPhoneFormGroup(phone));
        });
      }

      // Populate addresses
      if (profile.addresses && profile.addresses.length > 0) {
        profile.addresses.forEach((address: any) => {
          this.addresses.push(this.createAddressFormGroup(address));
        });
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to load profile');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected get emails(): FormArray<FormGroup<EmailFormGroup>> {
    return this.profileForm.controls.emails;
  }

  protected get phones(): FormArray<FormGroup<PhoneFormGroup>> {
    return this.profileForm.controls.phones;
  }

  protected get addresses(): FormArray<FormGroup<AddressFormGroup>> {
    return this.profileForm.controls.addresses;
  }

  private createEmailFormGroup(email?: any): FormGroup<EmailFormGroup> {
    return new FormGroup<EmailFormGroup>({
      id: new FormControl(email?.id || null),
      email: new FormControl(email?.email || '', { nonNullable: true, validators: [Validators.required, Validators.email] }),
      emailType: new FormControl(email?.emailType || 'personal', { nonNullable: true }),
      isPrimary: new FormControl(email?.isPrimary || false, { nonNullable: true })
    });
  }

  private createPhoneFormGroup(phone?: any): FormGroup<PhoneFormGroup> {
    return new FormGroup<PhoneFormGroup>({
      id: new FormControl(phone?.id || null),
      phoneNumber: new FormControl(phone?.phoneNumber || '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
      phoneType: new FormControl(phone?.phoneType || 'mobile', { nonNullable: true }),
      isPrimary: new FormControl(phone?.isPrimary || false, { nonNullable: true })
    });
  }

  private createAddressFormGroup(address?: any): FormGroup<AddressFormGroup> {
    return new FormGroup<AddressFormGroup>({
      id: new FormControl(address?.id || null),
      streetLine1: new FormControl(address?.streetLine1 || '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
      streetLine2: new FormControl(address?.streetLine2 || '', { nonNullable: true, validators: [Validators.maxLength(255)] }),
      city: new FormControl(address?.city || '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
      stateProvince: new FormControl(address?.stateProvince || '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
      postalCode: new FormControl(address?.postalCode || '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
      country: new FormControl(address?.country || 'USA', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
      addressType: new FormControl(address?.addressType || 'home', { nonNullable: true }),
      isPrimary: new FormControl(address?.isPrimary || false, { nonNullable: true })
    });
  }

  protected addEmail(): void {
    if (this.emails.length < 3) {
      this.emails.push(this.createEmailFormGroup());
    }
  }

  protected removeEmail(index: number): void {
    this.emails.removeAt(index);
    // Ensure at least one email
    if (this.emails.length === 0) {
      this.addEmail();
    }
  }

  protected addPhone(): void {
    if (this.phones.length < 5) {
      this.phones.push(this.createPhoneFormGroup());
    }
  }

  protected removePhone(index: number): void {
    this.phones.removeAt(index);
  }

  protected addAddress(): void {
    if (this.addresses.length < 5) {
      this.addresses.push(this.createAddressFormGroup());
    }
  }

  protected removeAddress(index: number): void {
    this.addresses.removeAt(index);
  }

  protected setPrimaryEmail(index: number): void {
    this.emails.controls.forEach((control, i) => {
      control.controls.isPrimary.setValue(i === index);
    });
  }

  protected setPrimaryPhone(index: number): void {
    this.phones.controls.forEach((control, i) => {
      control.controls.isPrimary.setValue(i === index);
    });
  }

  protected setPrimaryAddress(index: number): void {
    this.addresses.controls.forEach((control, i) => {
      control.controls.isPrimary.setValue(i === index);
    });
  }

  protected toggleEmails(): void {
    this.showEmails.update(value => !value);
  }

  protected togglePhones(): void {
    this.showPhones.update(value => !value);
  }

  protected toggleAddresses(): void {
    this.showAddresses.update(value => !value);
  }

  protected async onSubmit(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const formValue = this.profileForm.getRawValue();
      
      // Filter out empty/invalid phones (those with empty phone numbers)
      const validPhones = formValue.phones.filter(phone => phone.phoneNumber && phone.phoneNumber.trim().length > 0);
      
      // Filter out empty/invalid addresses (those with empty required fields)
      const validAddresses = formValue.addresses.filter(address => 
        address.streetLine1 && address.streetLine1.trim().length > 0 &&
        address.city && address.city.trim().length > 0 &&
        address.stateProvince && address.stateProvince.trim().length > 0 &&
        address.postalCode && address.postalCode.trim().length > 0 &&
        address.country && address.country.trim().length > 0
      );
      
      await this.usersService.updateProfile(userId, {
        firstName: formValue.firstName,
        middleName: formValue.middleName || undefined,
        lastName: formValue.lastName,
        emails: formValue.emails,
        phones: validPhones,
        addresses: validAddresses
      });

      // Reload the user info
      await this.authService.refreshCurrentUser();
      
      this.successMessage.set('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to update profile');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected cancel(): void {
    this.router.navigate(['/dashboard']);
  }

  protected async updateUserState(): Promise<void> {
    const userId = this.viewingUserId();
    if (!userId || !this.isAdmin()) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      await this.usersService.updateUserState(userId, this.selectedUserState());
      this.successMessage.set('User state updated successfully!');
      
      // Reload the profile
      await this.loadProfile(userId);
      
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to update user state');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected getFieldError(fieldName: string): string | null {
    const field = this.profileForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Invalid email address';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} characters required`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} characters allowed`;
    }
    return null;
  }

  protected getEmailError(index: number, fieldName: string): string | null {
    const field = this.emails.at(index).get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Invalid email address';
    }
    return null;
  }

  protected getPhoneError(index: number, fieldName: string): string | null {
    const field = this.phones.at(index).get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} characters allowed`;
    }
    return null;
  }

  protected getAddressError(index: number, fieldName: string): string | null {
    const field = this.addresses.at(index).get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} characters allowed`;
    }
    return null;
  }
}
