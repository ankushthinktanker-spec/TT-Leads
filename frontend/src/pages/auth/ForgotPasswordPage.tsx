import AuthShell from '../../components/auth/AuthShell';
import InlineAlert from '../../components/ui/InlineAlert';

const ForgotPasswordPage = () => {
    return (
        <AuthShell
            eyebrow="Password Support"
            title="Forgot Password"
            description="For security, password recovery is handled by your internal admin or operations team rather than self-service reset."
        >
            <InlineAlert tone="info" title="Next step">
                Reach out to your administrator and request a password reset for your ThinkTanker workspace account.
            </InlineAlert>
        </AuthShell>
    );
};

export default ForgotPasswordPage;
