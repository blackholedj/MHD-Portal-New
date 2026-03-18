// src/components/common/UserProfileModal.tsx
import React from 'react';
import { Role } from '@/context/AuthContext'; // Importujte Role type
import { X, User as UserIcon, Briefcase, CheckCircle, Clock, Mail } from 'lucide-react';

interface UserData {
    email: string;
    full_name: string | null;
    role: Role;
    status: 'pending' | 'approved';
    is_blocked: boolean;
}

interface UserProfileModalProps {
    userData: UserData; // Data získaná z useAuth()
    isOpen: boolean;
    onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userData, isOpen, onClose }) => {
    
    if (!isOpen || !userData) return null;

    // Funkce pro formátování statusu
    const getStatusDisplay = (status: 'pending' | 'approved', isBlocked: boolean) => {
        if (isBlocked) {
            return { text: 'Blokovaný ⛔', color: 'text-red-600' };
        }
        switch (status) {
            case 'approved':
                return { text: 'Schválený ✅', color: 'text-green-600' };
            case 'pending':
                return { text: 'Čekající ⏳', color: 'text-yellow-600' };
            default:
                return { text: 'Neznámý', color: 'text-gray-500' };
        }
    };
    
    const { text: statusText, color: statusColor } = getStatusDisplay(userData.status, userData.is_blocked);

    return (
        // Overlay
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
        >
            {/* Modal Content */}
            <div 
                className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 scale-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <UserIcon className="w-6 h-6 mr-2 text-blue-600" />
                        Detail uživatele
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Zobrazení celého jména (pokud existuje) nebo username */}
                    <div className="flex items-center">
                        <UserIcon className="w-5 h-5 mr-3 text-blue-500" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">
                                {userData.full_name ? 'Jméno a Příjmení' : 'Uživatelské jméno'}
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                                {userData.full_name || userData.email?.split('@')[0] || 'N/A'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Role */}
                    <div className="flex items-center">
                        <Briefcase className="w-5 h-5 mr-3 text-blue-500" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Role</p>
                            <p className="text-lg font-semibold text-gray-900 capitalize">
                                {userData.role === 'admin' ? 'Administrátor 👑' : 'Řidič / Uživatel 🚌'}
                            </p>
                        </div>
                    </div>
                    
                    {/* Status schválení */}
                    <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 mr-3 text-blue-500" />
                        <div>
                            <p className="text-sm font-medium text-gray-500">Status účtu</p>
                            <p className={`text-lg font-bold ${statusColor}`}>{statusText}</p>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-center border-t pt-4">
                         <Mail className="w-5 h-5 mr-3 text-gray-500" />
                         <div>
                            <p className="text-sm font-medium text-gray-500">Email</p>
                            <p className="text-gray-700 break-words">{userData.email}</p>
                         </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition font-semibold"
                    >
                        Zavřít
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;