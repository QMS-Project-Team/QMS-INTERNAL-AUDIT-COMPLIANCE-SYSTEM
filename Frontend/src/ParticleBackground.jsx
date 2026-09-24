import { useEffect, useRef } from "react";

const ParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        let width = 0;
        let height = 0;
        let animationFrame;

        const mouse = {
            x: -1000,
            y: -1000,
            targetX: -1000,
            targetY: -1000,
            active: false
        };

        let particles = [];

        const isMobile = () => window.innerWidth < 768;

        // ------------------------------------
        // Canvas resize
        // ------------------------------------
        const resizeCanvas = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);

            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = width * dpr;
            canvas.height = height * dpr;

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            createParticles();
        };

        // ------------------------------------
        // Create QMS particle map
        // ------------------------------------
        const createParticles = () => {
            particles = [];

            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");

            tempCanvas.width = width;
            tempCanvas.height = height;

            /*
             * QMS position.
             * Change 0.32 to move QMS left/right.
             */
            const centerX = width * 0.32;
            const centerY = height * 0.48;

            let fontSize;

            if (width < 500) {
                fontSize = Math.min(width * 0.30, 170);
            } else {
                fontSize = Math.min(width * 0.23, 300);
            }

            tempCtx.font = `900 ${fontSize}px Arial`;
            tempCtx.textAlign = "center";
            tempCtx.textBaseline = "middle";

            // Draw QMS in temporary canvas
            tempCtx.fillStyle = "#ffffff";
            tempCtx.fillText("QMS", centerX, centerY);

            const imageData = tempCtx.getImageData(
                0,
                0,
                width,
                height
            );

            /*
             * Particle spacing.
             *
             * Smaller value = more particles
             * Larger value = fewer particles
             */
            const gap = isMobile() ? 5 : 4;

            for (let y = 0; y < height; y += gap) {
                for (let x = 0; x < width; x += gap) {

                    const index = (y * width + x) * 4;

                    const alpha = imageData.data[index + 3];

                    if (alpha > 120) {

                        const spread = 10;

                        particles.push({
                            x: x + (Math.random() - 0.5) * spread,
                            y: y + (Math.random() - 0.5) * spread,

                            targetX: x,
                            targetY: y,

                            vx: 0,
                            vy: 0,

                            size: Math.random() * 1.7 + 0.7,

                            baseOpacity:
                                Math.random() * 0.55 + 0.45,

                            phase:
                                Math.random() * Math.PI * 2,

                            speed:
                                Math.random() * 0.02 + 0.01,

                            // Some particles become brighter
                            glow:
                                Math.random() > 0.82
                        });
                    }
                }
            }

            /*
             * Add a few floating particles
             * around QMS for atmosphere.
             */
            const extraParticles = isMobile() ? 80 : 160;

            for (let i = 0; i < extraParticles; i++) {

                const angle = Math.random() * Math.PI * 2;
                const radius =
                    Math.random() * Math.min(width * 0.35, 400);

                particles.push({
                    x:
                        centerX +
                        Math.cos(angle) * radius,

                    y:
                        centerY +
                        Math.sin(angle) *
                            radius *
                            0.65,

                    targetX:
                        centerX +
                        Math.cos(angle) * radius,

                    targetY:
                        centerY +
                        Math.sin(angle) *
                            radius *
                            0.65,

                    vx: 0,
                    vy: 0,

                    size:
                        Math.random() * 1.2 + 0.3,

                    baseOpacity:
                        Math.random() * 0.35 + 0.1,

                    phase:
                        Math.random() * Math.PI * 2,

                    speed:
                        Math.random() * 0.02 + 0.005,

                    glow:
                        Math.random() > 0.9
                });
            }
        };

        // ------------------------------------
        // Mouse movement
        // ------------------------------------
        const handleMouseMove = (event) => {

            mouse.targetX = event.clientX;
            mouse.targetY = event.clientY;
            mouse.active = true;
        };

        const handleMouseLeave = () => {
            mouse.active = false;
        };

        window.addEventListener(
            "mousemove",
            handleMouseMove
        );

        window.addEventListener(
            "mouseleave",
            handleMouseLeave
        );

        // ------------------------------------
        // Animation
        // ------------------------------------
        const animate = () => {

            ctx.clearRect(0, 0, width, height);

            /*
             * Smooth mouse movement
             */
            mouse.x +=
                (mouse.targetX - mouse.x) * 0.08;

            mouse.y +=
                (mouse.targetY - mouse.y) * 0.08;

            particles.forEach((particle) => {

                // --------------------------------
                // Return to QMS target position
                // --------------------------------
                const dx =
                    particle.targetX - particle.x;

                const dy =
                    particle.targetY - particle.y;

                particle.vx += dx * 0.018;
                particle.vy += dy * 0.018;

                /*
                 * Friction
                 */
                particle.vx *= 0.88;
                particle.vy *= 0.88;

                // --------------------------------
                // Mouse interaction
                // --------------------------------
                if (mouse.active) {

                    const mouseDx =
                        particle.x - mouse.x;

                    const mouseDy =
                        particle.y - mouse.y;

                    const distance = Math.sqrt(
                        mouseDx * mouseDx +
                        mouseDy * mouseDy
                    );

                    const interactionRadius = 170;

                    if (
                        distance <
                        interactionRadius
                    ) {

                        const force =
                            (1 -
                                distance /
                                    interactionRadius) *
                            1.8;

                        const angle =
                            Math.atan2(
                                mouseDy,
                                mouseDx
                            );

                        /*
                         * Push particles away
                         * from cursor
                         */
                        particle.vx +=
                            Math.cos(angle) *
                            force;

                        particle.vy +=
                            Math.sin(angle) *
                            force;
                    }
                }

                particle.x += particle.vx;
                particle.y += particle.vy;

                // --------------------------------
                // Twinkle
                // --------------------------------
                particle.phase +=
                    particle.speed;

                const twinkle =
                    Math.sin(particle.phase) *
                        0.25 +
                    0.75;

                const opacity =
                    particle.baseOpacity *
                    twinkle;

                // --------------------------------
                // Draw particle
                // --------------------------------
                ctx.beginPath();

                ctx.arc(
                    particle.x,
                    particle.y,
                    particle.size,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle = `rgba(
                    180,
                    220,
                    255,
                    ${opacity}
                )`;

                ctx.fill();

                // --------------------------------
                // Glow particles
                // --------------------------------
                if (particle.glow) {

                    ctx.beginPath();

                    ctx.arc(
                        particle.x,
                        particle.y,
                        particle.size * 4,
                        0,
                        Math.PI * 2
                    );

                    const gradient =
                        ctx.createRadialGradient(
                            particle.x,
                            particle.y,
                            0,
                            particle.x,
                            particle.y,
                            particle.size * 4
                        );

                    gradient.addColorStop(
                        0,
                        "rgba(80,180,255,0.45)"
                    );

                    gradient.addColorStop(
                        1,
                        "rgba(80,180,255,0)"
                    );

                    ctx.fillStyle = gradient;
                    ctx.fill();
                }
            });

            animationFrame =
                requestAnimationFrame(animate);
        };

        resizeCanvas();
        animate();

        window.addEventListener(
            "resize",
            resizeCanvas
        );

        return () => {

            cancelAnimationFrame(
                animationFrame
            );

            window.removeEventListener(
                "mousemove",
                handleMouseMove
            );

            window.removeEventListener(
                "mouseleave",
                handleMouseLeave
            );

            window.removeEventListener(
                "resize",
                resizeCanvas
            );
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="particle-canvas"
        />
    );
};

export default ParticleBackground;