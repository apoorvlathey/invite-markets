import { Metadata } from "next";
import ProfileClient from "./profile-client";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shortAddress = `${slug.slice(0, 6)}...${slug.slice(-4)}`;

  return {
    title: `${shortAddress} | invite.markets`,
    description: `View profile for ${shortAddress} on invite.markets`,
  };
}

export default async function ProfilePage({ params }: Props) {
  const { slug } = await params;

  return <ProfileClient address={slug} />;
}

