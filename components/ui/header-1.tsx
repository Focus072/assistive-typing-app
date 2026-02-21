'use client';
import React from 'react';
import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

export function Header() {
	const [open, setOpen] = React.useState(false);
	const [isLoading, setIsLoading] = React.useState(false);
	const scrolled = useScroll(10);
	const { data: session, status } = useSession();

	const links = [
		{
			label: 'Trust',
			href: '#trust',
		},
		{
			label: 'About',
			href: '#about',
		},
		{
			label: 'Pricing',
			href: '#pricing',
		},
	];

	React.useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	return (
		<header
			className={cn('sticky top-0 z-50 w-full', {
				'bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg':
					scrolled,
			})}
		>
			<nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
				<Link href="/" className="flex items-center" aria-label="Home">
					<img 
						src="/logo.svg" 
						alt="Typing Is Boring" 
						className="h-[186px] md:h-[210px] w-auto object-contain"
					/>
				</Link>
				<div className="hidden items-center gap-2 md:flex">
					{links.map((link) => (
						<a 
							key={link.label} 
							className={buttonVariants({ variant: 'ghost' })} 
							href={link.href}
							onClick={(e) => {
								if (link.href.startsWith('#')) {
									e.preventDefault()
									const element = document.getElementById(link.href.slice(1))
									if (element) {
										element.scrollIntoView({ behavior: 'smooth', block: 'start' })
									}
								}
							}}
						>
							{link.label}
						</a>
					))}
					{status === 'authenticated' && session ? (
						<>
							{/* Admin link for users with ADMIN role */}
							{(session.user as any)?.role === 'ADMIN' && (
								<Button variant="outline" asChild>
									<Link href="/admin">Admin</Link>
								</Button>
							)}
							{/* Dashboard when active subscription or admin */}
							{((session.user as any)?.subscriptionStatus === 'active' || (session.user as any)?.planTier === 'ADMIN' || (session.user as any)?.role === 'ADMIN') && (
								<Button variant="outline" asChild>
									<Link href="/dashboard">Dashboard</Link>
								</Button>
							)}
							<Button
								variant="outline"
								onClick={() => {
									signOut({ callbackUrl: '/' })
								}}
							>
								Sign Out
							</Button>
						</>
					) : (
						<Button 
							onClick={() => {
								if (isLoading) return
								setIsLoading(true)
								signIn('google', { callbackUrl: '/' })
							}}
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin mr-2" />
									Loading...
								</>
							) : (
								'Login with Google'
							)}
						</Button>
					)}
				</div>
				<Button
					size="icon"
					variant="outline"
					onClick={() => setOpen(!open)}
					className="md:hidden"
					aria-expanded={open}
					aria-controls="mobile-menu"
					aria-label="Toggle menu"
				>
					<MenuToggleIcon open={open} className="size-5" duration={300} />
				</Button>
			</nav>
			{/* Thin gray separator matching vertical dividers (1px, same tone) */}
			<div className="h-px w-full shrink-0 bg-gray-200/90" aria-hidden="true" />
			<MobileMenu open={open} className="flex flex-col justify-between gap-2">
				<div className="grid gap-y-2">
					{links.map((link) => (
						<a
							key={link.label}
							className={buttonVariants({
								variant: 'ghost',
								className: 'justify-start',
							})}
							href={link.href}
							onClick={(e) => {
								if (link.href.startsWith('#')) {
									e.preventDefault()
									setOpen(false)
									setTimeout(() => {
										const element = document.getElementById(link.href.slice(1))
										if (element) {
											element.scrollIntoView({ behavior: 'smooth', block: 'start' })
										}
									}, 100)
								} else {
									setOpen(false)
								}
							}}
						>
							{link.label}
						</a>
					))}
				</div>
				<div className="flex flex-col gap-2">
					{status === 'authenticated' && session ? (
						<>
							{(session.user as any)?.role === 'ADMIN' && (
								<Button variant="outline" asChild className="w-full">
									<Link href="/admin" onClick={() => setOpen(false)}>Admin</Link>
								</Button>
							)}
							{((session.user as any)?.subscriptionStatus === 'active' || (session.user as any)?.planTier === 'ADMIN' || (session.user as any)?.role === 'ADMIN') && (
								<Button variant="outline" asChild className="w-full">
									<Link href="/dashboard" onClick={() => setOpen(false)}>
										Dashboard
									</Link>
								</Button>
							)}
							<Button 
								variant="outline"
								className="w-full"
								onClick={() => {
									setOpen(false)
									signOut({ callbackUrl: '/' })
								}}
							>
								Sign Out
							</Button>
						</>
					) : (
						<Button 
							className="w-full"
							onClick={() => {
								if (isLoading) return
								setOpen(false)
								setIsLoading(true)
								signIn('google', { callbackUrl: '/' })
							}}
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin mr-2" />
									Loading...
								</>
							) : (
								'Login with Google'
							)}
						</Button>
					)}
				</div>
			</MobileMenu>
		</header>
	);
}

type MobileMenuProps = React.ComponentProps<'div'> & {
	open: boolean;
};

function MobileMenu({ open, children, className, ...props }: MobileMenuProps) {
	if (!open || typeof window === 'undefined') return null;

	return createPortal(
		<div
			id="mobile-menu"
			className={cn(
				'bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg',
				'fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden',
			)}
		>
			<div
				data-slot={open ? 'open' : 'closed'}
				className={cn(
					'data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out',
					'size-full p-4',
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
}

// Logo component removed - now using Image from Next.js
