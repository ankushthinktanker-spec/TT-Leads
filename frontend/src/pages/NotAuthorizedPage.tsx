import WorkspaceSection from '../components/ui/WorkspaceSection';

const NotAuthorizedPage = () => {
    return (
        <div className="page-layout max-w-3xl py-12">
            <WorkspaceSection
                title="Not authorized"
                description="This route is available only to users with the required access scope."
                eyebrow="Access control"
                className="text-center"
                contentClassName="pt-4"
            >
                <p className="mx-auto max-w-xl text-slate-500">
                    You do not have permission to access this page. Please contact an admin if you need access.
                </p>
            </WorkspaceSection>
        </div>
    );
};

export default NotAuthorizedPage;
