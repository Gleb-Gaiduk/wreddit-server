import { UsernamePasswordInput } from 'src/utils/UsernamePasswordInput';

export const validateRegister = (options: UsernamePasswordInput) => {
  if (!options.email.includes('@')) {
    return [
      {
        field: 'email',
        message: 'invalid email',
      },
    ];
  }

  if (options.username.length <= 2) {
    return [
      {
        field: 'username',
        message: 'username lenght might be greater than 2',
      },
    ];
  }

  if (options.password.length < 3) {
    return [
      {
        field: 'password',
        message: 'password length might be at least 8 characters',
      },
    ];
  }

  if (options.username.includes('@')) {
    return [
      {
        field: 'username',
        message: 'cannot include @ sign',
      },
    ];
  }

  return null;
};
