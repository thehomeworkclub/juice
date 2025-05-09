import React, { useState, useEffect, useRef } from 'react';

export default function JuiceWindow({ position, isDragging, isActive, handleMouseDown, handleDismiss, handleWindowClick, BASE_Z_INDEX, ACTIVE_Z_INDEX, userData, setUserData, startJuicing, playCollectSound, isJuicing }) {
    const [isJuicingLocal, setIsJuicingLocal] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [currentStretchId, setCurrentStretchId] = useState(null);
    const [timeJuiced, setTimeJuiced] = useState('0:00');
    const [startTime, setStartTime] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stopTime, setStopTime] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [totalPauseTimeSeconds, setTotalPauseTimeSeconds] = useState(0)
    const fileInputRef = useRef(null);
    const clickSoundRef = useRef(null);
    const expSoundRef = useRef(null);
    const congratsSoundRef = useRef(null);
    const [juicerImage, setJuicerImage] = useState('/juicerRest.png');

    // Add play click function
    const playClick = () => {
        if (clickSoundRef.current) {
            clickSoundRef.current.currentTime = 0;
            clickSoundRef.current.play().catch(e => console.error('Error playing click:', e));
        }
    };

    const playExp = () => {
        if (expSoundRef.current) {
            expSoundRef.current.volume = 0.5;
            expSoundRef.current.currentTime = 0;
            expSoundRef.current.play().catch(e => console.error('Error playing exp:', e));
        }
    };

    const playCongratsSound = () => {
        if (congratsSoundRef.current) {
            congratsSoundRef.current.currentTime = 0;
            congratsSoundRef.current.play().catch(e => console.error('Error playing congrats sound:', e));
        }
    };

    useEffect(() => {
        let interval;
        let saveInterval;
        if (isJuicingLocal && startTime && !stopTime && !isPaused) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now - startTime) / 1000 - totalPauseTimeSeconds);
                const minutes = Math.floor(diff / 60);
                const seconds = diff % 60;
                setTimeJuiced(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }, 1000);
            // Update pausedTimeStart without actually pausing so if the broswer closes unexpectedly you can resume your progress
        if (isJuicingLocal && startTime && !stopTime && !isPaused){
            saveInterval = setInterval(async () => {
                try {
                    const response = await fetch('/api/pause-juice-stretch', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            token: userData.token,
                            stretchId: currentStretchId
                        }),
                    });
        
                    if (!response.ok) {
                        throw new Error('Failed to pause juice stretch');
                    }
                } catch (error) {
                    console.error('Error pausing juice stretch:', error);
                }
            }, 10000)
        }
        }
        return () => {
            clearInterval(interval)
            clearInterval(saveInterval)
        };
    }, [isJuicingLocal, startTime, stopTime, isPaused]);

    // Load data
    useEffect(() => {
        async function loadData() {
            try {
                const response = await fetch('/api/load-juice-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: userData.token
                    }),
                })
                if (!response.ok) {
                    throw new Error('Failed to pause juice stretch');
                }

                const data = await response.json()
                if(data.id == undefined) return;
                setIsJuicingLocal(true);
                setCurrentStretchId(data.id);
                const startTimeDate = new Date(data.startTime)
                setStartTime(startTimeDate);
                setIsPaused(true);
                setTotalPauseTimeSeconds(data.totalPauseTimeSeconds);
                const now = new Date();
                const diff = Math.floor((now - startTimeDate) / 1000 - data.totalPauseTimeSeconds);
                const minutes = Math.floor(diff / 60);
                const seconds = diff % 60;
                setTimeJuiced(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                
            } catch (error) {
                console.error('Error pausing juice stretch:', error);
            }
        }
        loadData()
    }, [])

    const handleStartJuicing = async () => {
        if (!confirm("Just to confirm, you have your game editor ready and you're ready to start working on your game? also sorry but pls keep demo clip at 4mb or less, will fix this soon ~Thomas")) {
            return;
        }

        try {
            const response = await fetch('/api/start-juice-stretch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: userData.token
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to start juice stretch');
            }

            const data = await response.json();
            setCurrentStretchId(data.stretchId);
            setIsJuicingLocal(true);
            setStartTime(new Date());
            setStopTime(null);
            setSelectedVideo(null);
            setDescription('');
            playCongratsSound();
            setIsPaused(false);
            setTotalPauseTimeSeconds(0);
            setJuicerImage('/juicerAnimation.gif');

        } catch (error) {
            console.error('Error starting juice stretch:', error);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (!file.type.startsWith('video/')) {
                alert('Please select a video file');
                return;
            }
            
            // Check file size (4MB = 4 * 1024 * 1024 bytes)
            if (file.size > 4 * 1024 * 1024) {
                alert("I'm sorry, we have a 4mb limit on file uploads rn. I am fixing this! ~Thomas");
                return;
            }
            
            setSelectedVideo(file);
            setStopTime(new Date());
        }
    };

    const handleEndStretch = async () => {
        if (!selectedVideo || !description.trim()) {
            alert('Please upload a video and add a description');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('video', selectedVideo);
            formData.append('description', description);
            formData.append('token', userData.token);
            formData.append('stretchId', currentStretchId);
            formData.append('stopTime', stopTime.toISOString());

            try {
                const response = await fetch('/api/resume-juice-stretch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: userData.token,
                        stretchId: currentStretchId
                    }),
                });
    
                if (!response.ok) {
                    throw new Error('Failed to resume juice stretch');
                }
                const data = await response.json();
                console.log(data.newPauseTime)
                setTotalPauseTimeSeconds(data.newPauseTime)
                setIsPaused(false);
            } catch (error) {
                console.error('Error resuming juice stretch:', error);
            }

            const response = await fetch('/api/create-omg-moment', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to create OMG moment');
            }

            // Fetch updated user data to get new total time
            const userResponse = await fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${userData.token}`
                }
            });
            
            if (userResponse.ok) {
                const { userData: updatedUserData } = await userResponse.json();
                setUserData(updatedUserData);
            }

            // Play collect sound when successful
            playCollectSound();

            setIsJuicingLocal(false);
            setCurrentStretchId(null);
            setStartTime(null);
            setStopTime(null);
            setSelectedVideo(null);
            setDescription('');
            setTimeJuiced('0:00');
            setIsPaused(false);
            setJuicerImage('/juicerRest.png');
        } catch (error) {
            console.error('Error creating OMG moment:', error);
            alert('Failed to create OMG moment. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelStretch = async () => {
        if (!confirm("Are you sure you want to cancel this juice stretch? Your time won't be logged.")) {
            return;
        }
        try {
            const response = await fetch('/api/cancel-juice-stretch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: userData.token,
                    stretchId: currentStretchId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to pause juice stretch');
            }

            setIsJuicingLocal(false);
            setCurrentStretchId(null);
            setStartTime(null);
            setStopTime(null);
            setSelectedVideo(null);
            setDescription('');
            setTimeJuiced('0:00');
            setIsPaused(false);
            setJuicerImage('/juicerRest.png');
        } catch (error) {
            console.error('Error pausing juice stretch:', error);
        }
    };

    const handlePauseStretch = async () => {
        if (!confirm("Are you sure you want to pause this juice stretch?")) {
            return;
        }

        try {
            const response = await fetch('/api/pause-juice-stretch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: userData.token,
                    stretchId: currentStretchId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to pause juice stretch');
            }
            setIsPaused(true);
            setJuicerImage('/juicerRest.png');
        } catch (error) {
            console.error('Error pausing juice stretch:', error);
        }
    };

    const handleResumeStretch = async () => {
        if (!confirm("Are you sure you want to resume this juice stretch?")) {
            return;
        }

        try {
            const response = await fetch('/api/resume-juice-stretch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: userData.token,
                    stretchId: currentStretchId
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to resume juice stretch');
            }
            const data = await response.json();
            console.log(data.newPauseTime)
            setTotalPauseTimeSeconds(data.newPauseTime)
            setIsPaused(false);
            setJuicerImage('/juicerAnimation.gif');
            playCongratsSound();
        } catch (error) {
            console.error('Error resuming juice stretch:', error);
        }
    };

    return (
        <>
            <audio ref={clickSoundRef} src="./click.mp3" />
            <audio ref={expSoundRef} src="./expSound.mp3" volume="0.5" />
            <audio ref={congratsSoundRef} src="./juicercongrats.mp3" />
            <div 
                onClick={handleWindowClick('juiceWindow')}
                style={{
                    display: "flex", 
                    position: "absolute", 
                    zIndex: isActive ? ACTIVE_Z_INDEX : BASE_Z_INDEX, 
                    width: 400,
                    height: 475,
                    color: 'black',
                    backgroundColor: "#fff", 
                    border: "1px solid #000", 
                    borderRadius: 4,
                    flexDirection: "column",
                    padding: 0,
                    justifyContent: "space-between",
                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                    top: "50%",
                    left: "50%",
                    userSelect: "none"
                }}>
                <div 
                    onMouseDown={handleMouseDown('juiceWindow')}
                    style={{
                        display: "flex", 
                        borderBottom: "1px solid #000", 
                        padding: 8, 
                        flexDirection: "row", 
                        justifyContent: "space-between", 
                        cursor: isDragging ? 'grabbing' : 'grab'
                    }}>
                    <div style={{display: "flex", flexDirection: "row", gap: 8}}>
                        <button onClick={(e) => { 
                            e.stopPropagation(); 
                            playClick();
                            handleDismiss('juiceWindow'); 
                        }}>x</button>
                    </div>
                    <p>Juicer (v0.3)</p>
                    <div></div>
                </div>
                <div style={{flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 8}}>
                    {!showExplanation ? (
                        <>
                            <h1 style={{fontSize: 32, lineHeight: 1}}>Juicer (v0.3)</h1>
                            {isJuicing &&
                            <p>Log your time working on a feature then share "OMG IT WORKS" moment when you make it work</p>
                            }
                            <div style={{display: "flex", flexDirection: "column", gap: 4}}>
                                <p>Current Session: {timeJuiced}</p>
                                <p>Total Time Juiced: {userData?.totalStretchHours ? 
                                    `${Math.floor(userData.totalStretchHours)} hours ${Math.round((userData.totalStretchHours % 1) * 60)} min` : 
                                    "0 hours 0 min"}</p>
                            </div>
                            
                            <div style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                margin: "10px 0",
                            }}>
                                <img 
                                    src={juicerImage}
                                    alt="Juicer"
                                    style={{
                                        width: "150px",
                                        height: "150px",
                                        imageRendering: "pixelated",
                                        objectFit: "contain"
                                    }}
                                />
                            </div>

                            {!isJuicingLocal &&
                            <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                                <button onClick={() => {
                                    playClick();
                                    handleStartJuicing();
                                }}>
                                    Start Juicing
                                </button>
                                <button onClick={() => {
                                    playClick();
                                    setShowExplanation(true);
                                }}>
                                    What is this?
                                </button>
                            </div>}
                            {isJuicingLocal &&
                            <div style={{padding: 8, display: 'flex', gap: 4, flexDirection: "column", border: "1px solid #000"}}>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="video/*"
                                    style={{ display: 'none' }}
                                />
                                <p 
                                    onClick={handleUploadClick}
                                    style={{
                                        cursor: 'pointer', 
                                        textAlign: "center", 
                                        width: "100%", 
                                        padding: 4, 
                                        border: "1px solid #000", 
                                        textDecoration: 'underline'
                                    }}
                                >
                                    {selectedVideo ? selectedVideo.name : 'Upload Video'}
                                </p>
                                <textarea 
                                    style={{width: "100%", padding: 2}} 
                                    placeholder="wut works?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                                <button 
                                    onClick={() => {
                                        playClick();
                                        handleEndStretch();
                                    }}
                                    disabled={isSubmitting}
                                    style={{width: "100%"}}
                                >
                                    {isSubmitting ? 'Juicing...' : 'End Stretch with your "OMG IT WORKS" moment'}
                                </button>
                                <div style={{width: "100%", display: "flex"}}>
                                    {isPaused ? (
                                        <button 
                                        onClick={() => {
                                            playClick();
                                            handleResumeStretch();
                                        }}
                                        style={{width: "100%", borderRight: "none"}}
                                    >
                                        Resume Juice Stretch
                                    </button>
                                    ) : (
                                         <button 
                                         onClick={() => {
                                             playClick();
                                             handlePauseStretch();
                                         }}
                                         style={{width: "100%", borderRight: "none"}}
                                     >
                                         Pause Juice Stretch
                                     </button>
                                    )}
                                   
                                    <button 
                                        onClick={() => {
                                            playClick();
                                            handleCancelStretch();
                                        }}
                                        style={{width: "100%", backgroundColor: "#ffebee", color: "#d32f2f"}}
                                    >
                                        Cancel Juice Stretch
                                    </button>
                                </div>
                            </div>
                            }
                        </>
                    ) : (
                        <div style={{display: "flex", flexDirection: "column", gap: 16}}>
                            <p>Juicer is a way to gamify your process making mini-ships for your game & to log the time you spend making them. When you start working on your game, open the Juicer and "Start Juicing". Once you have an "OMG IT WORKS MOMENT" capture that beautiful moment & share it with the Juice community. We'll come and give kudos to congratulate you & you'll get credit for that time :) <br/><br/>The Juicer is how you will log your time to hit the 100 hour game achievement.</p>
                            <button onClick={() => {
                                playClick();
                                setShowExplanation(false);
                            }}>
                                Return to Juicer
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
} 