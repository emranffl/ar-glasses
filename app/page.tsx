import dynamic from "next/dynamic"

export default function Home() {
	const CameraComponent = dynamic(
		() => import("@/components/CameraComponent"),
		{
			ssr: false,
		}
	)
	return (
		<main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
			<div className="container mx-auto px-4 py-8">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">
						AR Sunglasses
					</h1>
					<p className="text-zinc-400">
						Try on virtual sunglasses using AI face detection!
					</p>
				</div>
				<div className="max-w-3xl mx-auto">
					<CameraComponent />
				</div>
			</div>
		</main>
	)
}
