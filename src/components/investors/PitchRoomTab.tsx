const PitchRoomTab = () => {
  return (
    <div className="max-w-3xl mx-auto text-center py-16">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🎤</span>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Pitch Room</h2>
      <p className="text-muted-foreground mb-6">
        Practice your pitch, get feedback from investors, and join live pitch sessions.
      </p>
      <button className="bg-primary text-primary-foreground font-medium px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity">
        Coming Soon
      </button>
    </div>
  );
};

export default PitchRoomTab;
