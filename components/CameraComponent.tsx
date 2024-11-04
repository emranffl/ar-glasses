"use client"

import { useEffect, useRef, useState } from "react"
import * as tf from "@tensorflow/tfjs"
import * as blazeface from "@tensorflow-models/blazeface"
import { Camera, SunDim } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import sunglass from "./sunglass.png"

export default function CameraComponent() {
	const videoRef = useRef<HTMLVideoElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [isCameraActive, setIsCameraActive] = useState(false)
	const [error, setError] = useState<string>("")
	const modelRef = useRef<blazeface.BlazeFaceModel | null>(null)
	const animationFrameRef = useRef<number>()
	const sunglassesRef = useRef<HTMLImageElement>()

	useEffect(() => {
		const sunglasses = new Image()
		sunglasses.src = sunglass.src
		sunglassesRef.current = sunglasses

		const loadModel = async () => {
			try {
				await tf.ready()
				modelRef.current = await blazeface.load()
				setIsLoading(false)
			} catch (err) {
				setError("Failed to load face detection model")
				setIsLoading(false)
			}
		}

		loadModel()

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
			}
		}
	}, [])

	const startCamera = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user" },
			})

			if (videoRef.current) {
				videoRef.current.srcObject = stream
				setIsCameraActive(true)
				detectFaces()
			}
		} catch (err) {
			setError("Failed to access camera")
		}
	}

	const stopCamera = () => {
		if (videoRef.current?.srcObject) {
			const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
			tracks.forEach(track => track.stop())
			videoRef.current.srcObject = null
			setIsCameraActive(false)

			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
			}

			const ctx = canvasRef.current?.getContext("2d")
			if (ctx && canvasRef.current) {
				ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
			}
		}
	}

	const detectFaces = async () => {
		if (!modelRef.current || !videoRef.current || !canvasRef.current) return

		const video = videoRef.current
		const canvas = canvasRef.current
		const ctx = canvas.getContext("2d")

		if (!ctx) return

		const detectFrame = async () => {
			if (video.readyState === 4) {
				const videoDimensions = video.getBoundingClientRect()
				canvas.width = videoDimensions.width
				canvas.height = videoDimensions.height

				const scaleX = video.videoWidth / videoDimensions.width
				const scaleY = video.videoHeight / videoDimensions.height

				ctx.clearRect(0, 0, canvas.width, canvas.height)

				try {
					const predictions = await modelRef.current!.estimateFaces(
						video,
						false
					)

					predictions.forEach((prediction: any) => {
						const start = prediction.topLeft as [number, number]
						const end = prediction.bottomRight as [number, number]
						const size = [
							(end[0] - start[0]) / scaleX,
							(end[1] - start[1]) / scaleY,
						]

						const glassesWidth = size[0] * 1.1
						const glassesHeight = size[1] * 0.5
						const glassesX = start[0] / scaleX - (glassesWidth - size[0]) / 2
						const glassesY = start[1] / scaleY + size[1] * 0.2

						// Check if sunglasses image is loaded before drawing
						if (sunglassesRef.current && sunglassesRef.current.complete) {
							// Add debugging logs to verify coordinates and size
							console.log("Drawing sunglasses at:", {
								x: glassesX,
								y: glassesY,
								width: glassesWidth,
								height: glassesHeight,
							})

							ctx.drawImage(
								sunglassesRef.current,
								glassesX,
								glassesY,
								glassesWidth,
								glassesHeight
							)
						} else {
							console.log("Sunglasses image not yet loaded.")
						}
					})
				} catch (err) {
					console.error("Face detection error:", err)
				}
			}

			animationFrameRef.current = requestAnimationFrame(detectFrame)
		}

		detectFrame()
	}

	return (
		<div className="flex flex-col items-center space-y-4">
			<div className="relative w-full max-w-2xl aspect-video bg-zinc-800 rounded-lg overflow-hidden">
				{/* Video Container */}
				<div className="absolute inset-0 z-10">
					<video
						ref={videoRef}
						className={cn(
							"w-full h-full object-cover",
							!isCameraActive && "hidden"
						)}
						autoPlay
						playsInline
						muted
					/>
				</div>

				{/* Canvas Container */}
				<div className="absolute inset-0 z-20 pointer-events-none">
					<canvas
						ref={canvasRef}
						className="w-full h-full border border-red-500" // Temporary border to visualize canvas position
					/>
				</div>

				{/* Placeholder Icon */}
				{!isCameraActive && !isLoading && (
					<div className="absolute inset-0 z-30 flex items-center justify-center">
						<Camera className="w-16 h-16 text-zinc-600" />
					</div>
				)}

				{/* Loading Spinner */}
				{isLoading && (
					<div className="absolute inset-0 z-30 flex items-center justify-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
					</div>
				)}
			</div>

			{error && <p className="text-red-500 text-sm">{error}</p>}

			<Button
				className="w-full max-w-xs"
				onClick={isCameraActive ? stopCamera : startCamera}
				disabled={isLoading}
			>
				{isCameraActive ? (
					<>
						<SunDim className="w-4 h-4 mr-2" />
						Stop Camera
					</>
				) : (
					<>
						<Camera className="w-4 h-4 mr-2" />
						Start Camera
					</>
				)}
			</Button>
		</div>
	)
}
