import { GetStaticProps } from 'next';
import Layout from '@/components/layout';
import { defaultMetaProps } from '@/components/layout/meta';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';

export default function Custom500() {
  const router = useRouter();

  return (
    <Layout 
      meta={{
        ...defaultMetaProps,
        title: '500 | Meraki Dashboard',
        ogUrl: 'https://mongodb.vercel.app/500'
      }}
      showNavigation={false}
    >
      <div className="h-screen w-full flex justify-center items-center bg-background">
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold text-muted-foreground">500</h1>
          <h2 className="text-2xl font-semibold">Internal Server Error</h2>
          <p className="text-muted-foreground max-w-md">
            Something went wrong on our end. Please try again later.
          </p>
          <div className="space-x-4">
            <Button onClick={() => router.push('/networks')}>
              Go to Networks
            </Button>
            <Button variant="outline" onClick={() => router.reload()}>
              Reload Page
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
