import { useEffect, useRef } from "react";
import "./ParticleBackground.css";

function ParticleBackground() {

    const canvasRef = useRef(null);

    useEffect(() => {

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        let animationFrame;

        let width = 0;
        let height = 0;

        let centerX = 0;
        let centerY = 0;

        let particles = [];

        let time = 0;


        /* =========================================
           SMOOTH MOUSE
        ========================================= */

        const mouse = {

            x: 0,
            y: 0,

            targetX: 0,
            targetY: 0,

            active: false

        };


        /* =========================================
           RESIZE
        ========================================= */

        function resize() {

            const dpr = Math.min(
                window.devicePixelRatio || 1,
                2
            );

            width = window.innerWidth;
            height = window.innerHeight;

            canvas.width = width * dpr;
            canvas.height = height * dpr;

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            ctx.setTransform(
                dpr,
                0,
                0,
                dpr,
                0,
                0
            );

            centerX = width * 0.28;
            centerY = height / 2;


            if (!mouse.active) {

                mouse.x = centerX;
                mouse.y = centerY;

                mouse.targetX = centerX;
                mouse.targetY = centerY;

            }

            createParticles();
        }


        /* =========================================
           CREATE GALAXY PARTICLES
        ========================================= */

        function createParticles() {

            particles = [];

            /*
             * 750 is smoother on normal laptops.
             * You can increase to 1000 later.
             */

            const count =
                width < 768
                    ? 450
                    : 750;


            const maxRadius =
                Math.min(
                    width,
                    height
                ) * 0.47;


            for (let i = 0; i < count; i++) {

                const arm =
                    i % 3;


                /*
                 * More particles toward center
                 */

                const random =
                    Math.pow(
                        Math.random(),
                        0.72
                    );


                const radius =
                    random * maxRadius;


                /*
                 * Spiral shape
                 */

                const spiral =
                    radius * 0.014;


                const baseAngle =
                    arm *
                    (
                        Math.PI * 2 / 3
                    );


                const angle =
                    baseAngle +
                    spiral +
                    (
                        Math.random() - 0.5
                    ) *
                    0.55;


                /*
                 * Width of spiral arm
                 */

                const spread =
                    (
                        Math.random() - 0.5
                    ) *
                    (
                        10 +
                        radius * 0.035
                    );


                particles.push({

                    radius,

                    angle,

                    spread,

                    arm,

                    size:
                        Math.random() <
                        0.9
                            ? Math.random() *
                              1.3 +
                              0.25
                            : Math.random() *
                              2.8 +
                              1.2,

                    alpha:
                        Math.random() *
                        0.65 +
                        0.25,

                    speed:
                        Math.random() *
                        0.0008 +
                        0.00025,

                    twinkle:
                        Math.random() *
                        Math.PI *
                        2,

                    warm:
                        Math.random() <
                        0.08

                });

            }

        }


        /* =========================================
           MOUSE MOVE
        ========================================= */

        function handleMouseMove(e) {

            mouse.targetX = e.clientX;
            mouse.targetY = e.clientY;

            mouse.active = true;

        }


        /* =========================================
           MOUSE LEAVE
        ========================================= */

        function handleMouseLeave() {

            mouse.active = false;

            mouse.targetX = centerX;
            mouse.targetY = centerY;

        }


        /* =========================================
           DRAW GLOWING PARTICLE
        ========================================= */

        function drawParticle(
            x,
            y,
            size,
            alpha,
            warm
        ) {

            /*
             * Large particles get glow.
             */

            if (size > 1.2) {

                const glowSize =
                    size * 7;


                const gradient =
                    ctx.createRadialGradient(
                        x,
                        y,
                        0,
                        x,
                        y,
                        glowSize
                    );


                if (warm) {

                    gradient.addColorStop(
                        0,
                        `rgba(
                            255,
                            220,
                            190,
                            ${alpha}
                        )`
                    );

                    gradient.addColorStop(
                        0.3,
                        `rgba(
                            255,
                            180,
                            120,
                            ${alpha * 0.35}
                        )`
                    );

                } else {

                    gradient.addColorStop(
                        0,
                        `rgba(
                            230,
                            245,
                            255,
                            ${alpha}
                        )`
                    );

                    gradient.addColorStop(
                        0.3,
                        `rgba(
                            100,
                            180,
                            255,
                            ${alpha * 0.4}
                        )`
                    );

                }


                gradient.addColorStop(
                    1,
                    "rgba(0,0,0,0)"
                );


                ctx.fillStyle = gradient;

                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    glowSize,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

            }


            /*
             * Bright particle center
             */

            ctx.beginPath();

            ctx.fillStyle = warm
                ? `rgba(
                    255,
                    225,
                    200,
                    ${alpha}
                )`
                : `rgba(
                    220,
                    240,
                    255,
                    ${alpha}
                )`;

            ctx.arc(
                x,
                y,
                size,
                0,
                Math.PI * 2
            );

            ctx.fill();

        }


        /* =========================================
           ANIMATION
        ========================================= */

        function animate() {

            time += 0.01;


            /*
             * VERY SMOOTH MOUSE FOLLOW
             *
             * Smaller number = smoother
             */

            mouse.x +=
                (
                    mouse.targetX -
                    mouse.x
                ) * 0.045;


            mouse.y +=
                (
                    mouse.targetY -
                    mouse.y
                ) * 0.045;


            /*
             * Clear screen
             */

            ctx.fillStyle =
                "rgba(1, 5, 9, 0.30)";

            ctx.fillRect(
                0,
                0,
                width,
                height
            );


            /*
             * Mouse distance from center
             */

            const mouseDX =
                mouse.x - centerX;

            const mouseDY =
                mouse.y - centerY;


            const mouseDistance =
                Math.sqrt(
                    mouseDX * mouseDX +
                    mouseDY * mouseDY
                );


            /*
             * Mouse angle
             */

            const mouseAngle =
                Math.atan2(
                    mouseDY,
                    mouseDX
                );


            /*
             * Draw particles
             */

            for (
                let i = 0;
                i < particles.length;
                i++
            ) {

                const particle =
                    particles[i];


                /*
                 * Slow galaxy rotation
                 */

                particle.angle +=
                    particle.speed;


                /*
                 * Base spiral angle
                 */

                let angle =
                    particle.angle;


                /*
                 * Smooth mouse influence
                 */

                const centerInfluence =
                    Math.max(
                        0,
                        1 -
                        mouseDistance /
                        (
                            Math.min(
                                width,
                                height
                            ) *
                            0.75
                        )
                    );


                /*
                 * Galaxy bends slightly
                 * toward cursor.
                 */

                const angleDifference =
                    Math.atan2(
                        Math.sin(
                            mouseAngle -
                            angle
                        ),
                        Math.cos(
                            mouseAngle -
                            angle
                        )
                    );


                angle +=
                    angleDifference *
                    centerInfluence *
                    0.08;


                /*
                 * Mouse creates subtle
                 * breathing effect.
                 */

                const breathing =
                    1 +
                    centerInfluence *
                    0.08;


                const radius =
                    particle.radius *
                    breathing;


                /*
                 * Spiral position
                 */

                let x =
                    centerX +
                    Math.cos(angle) *
                    radius;


                let y =
                    centerY +
                    Math.sin(angle) *
                    radius *
                    0.72;


                /*
                 * Organic movement along arm
                 */

                const wave =
                    Math.sin(
                        time +
                        particle.twinkle
                    );


                x +=
                    particle.spread *
                    wave;


                y +=
                    particle.spread *
                    Math.cos(
                        time * 0.8 +
                        particle.twinkle
                    );


                /*
                 * Cursor attraction
                 *
                 * Only particles close
                 * to cursor are affected.
                 */

                const dx =
                    mouse.x - x;

                const dy =
                    mouse.y - y;


                const distance =
                    Math.sqrt(
                        dx * dx +
                        dy * dy
                    );


                if (distance < 280) {

                    const force =
                        Math.pow(
                            1 -
                            distance / 280,
                            2
                        ) *
                        0.22;


                    x += dx * force;

                    y += dy * force;

                }


                /*
                 * Gentle particle twinkle
                 */

                const twinkle =
                    1 +
                    Math.sin(
                        time * 2 +
                        particle.twinkle
                    ) *
                    0.22;


                /*
                 * Draw
                 */

                drawParticle(

                    x,

                    y,

                    particle.size *
                    twinkle,

                    particle.alpha,

                    particle.warm

                );

            }


            animationFrame =
                requestAnimationFrame(
                    animate
                );

        }


        /* =========================================
           START
        ========================================= */

        resize();

        animate();


        /* =========================================
           EVENTS
        ========================================= */

        window.addEventListener(
            "resize",
            resize
        );

        window.addEventListener(
            "mousemove",
            handleMouseMove
        );

        window.addEventListener(
            "mouseleave",
            handleMouseLeave
        );


        /* =========================================
           CLEANUP
        ========================================= */

        return () => {

            cancelAnimationFrame(
                animationFrame
            );

            window.removeEventListener(
                "resize",
                resize
            );

            window.removeEventListener(
                "mousemove",
                handleMouseMove
            );

            window.removeEventListener(
                "mouseleave",
                handleMouseLeave
            );

        };

    }, []);


    return (
        <canvas
            ref={canvasRef}
            className="particle-canvas"
        />
    );
}


export default ParticleBackground;