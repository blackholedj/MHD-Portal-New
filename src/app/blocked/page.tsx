// src/app/blocked/page.tsx
const BlockedPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6 text-center">
            <h1 className="text-4xl font-bold text-red-700 mb-4">🚫 Váš účet byl zablokován</h1>
            <p className="text-lg text-gray-600">
                Nemáte přístup k uživatelskému portálu. Pro další informace kontaktujte prosím administrátora.
            </p>
        </div>
    );
};
export default BlockedPage;