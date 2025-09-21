import React from 'react';
import AuthModal from './auth/AuthModal';

// Lightweight wrapper exported as SimpleAuthModal for legacy pages.
export default function SimpleAuthModal(props) {
	return <AuthModal {...props} />;
}
