

import React from 'react';
import { Ionicons } from '@expo/vector-icons';

export function ValidIndicator({ isValid }: { isValid: boolean }) {
  return (
    <Ionicons
      name={isValid ? 'checkmark-circle' : 'close-circle'}
      size={24}
      color={isValid ? 'green' : 'red'}
    />
  );
}
