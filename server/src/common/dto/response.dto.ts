export class ResponseDto<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;

  constructor(success: boolean, data?: T, message?: string, error?: string) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
  }

  static success<T>(data?: T, message?: string): ResponseDto<T> {
    return new ResponseDto(true, data, message);
  }

  static error(message: string, error?: string): ResponseDto {
    return new ResponseDto(false, undefined, message, error);
  }
}
