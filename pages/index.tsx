import { GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Layout from '@/components/layout';
import { defaultMetaProps } from '@/components/layout/meta';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to networks page
    router.replace('/networks');
  }, [router]);

  return (
    <Layout meta={defaultMetaProps} showNavigation={false}>
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Cisco Meraki Dashboard</h1>
          <p className="text-muted-foreground">Redirecting to Networks...</p>
        </div>
      </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      meta: defaultMetaProps
    }
  };
};
