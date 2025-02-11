// app/page.tsx
'use client';

import React, { Suspense } from 'react';
import ChatPage from './ChatPage'; // assume you move your ChatPage code to ChatPage.tsx

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  );
}