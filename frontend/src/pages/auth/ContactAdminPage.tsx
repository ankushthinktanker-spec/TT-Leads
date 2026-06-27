import AuthShell from '../../components/auth/AuthShell';
import InlineAlert from '../../components/ui/InlineAlert';

const ContactAdminPage = () => {
    return (
        <AuthShell
            eyebrow="Access Provisioning"
            title="Request workspace access"
            description="ThinkTanker accounts are provisioned by your internal admin or operations team to keep tenant and role access controlled."
        >
            <InlineAlert tone="muted" title="Provisioning note">
                Contact your internal operations or admin team to request a new account, role change, or access approval.
            </InlineAlert>
        </AuthShell>
    );
};

export default ContactAdminPage;
