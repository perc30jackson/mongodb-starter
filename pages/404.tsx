import { GetStaticProps } from 'next';
import Layout from '@/components/layout';
import { defaultMetaProps } from '@/components/layout/meta';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';

export default function Custom404() {
  const router = useRouter();

  return (
    <Layout 
      meta={{
        ...defaultMetaProps,
        title: '404 | Meraki Dashboard',
        ogUrl: 'https://mongodb.vercel.app/404'
      }}
      showNavigation={false}
    >
      <div className="h-screen w-full flex justify-center items-center bg-background">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="space-x-4">
            <Button onClick={() => router.push('/networks')}>
              Go to Networks
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {}
  };
};
