import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTransition, SectionTransition } from '@/components/transitions/page-transition';
import { MetaTags } from '@/components/seo/meta-tags';

export default function AnimationTest() {
  const [count, setCount] = useState(0);
  const [pageEffect, setPageEffect] = useState<"fade" | "slide" | "scale" | "flip" | "bounce">("fade");
  
  const triggerAnimation = () => {
    setCount(count + 1);
  };
  
  // These animations are intentionally super extreme and obvious
  const boxVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.1,
      rotate: -360, // Full rotation
      y: 300,
      filter: "blur(20px)"
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      rotate: 0,
      y: 0,
      filter: "blur(0px)",
      transition: { 
        duration: 2.0, // Super long duration
        ease: "easeOut"
      }
    }
  };
  
  const pulseAnimation = {
    scale: [1, 1.2, 1],
    backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ff0000'],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: "loop" as const
    }
  };

  return (
    <PageTransition effect={pageEffect}>
      <div className="container mx-auto py-10">
        <MetaTags title="Animation Test Page | OPIAN Rewards" />
        <h1 className="text-4xl font-bold mb-6 text-center">Animation Test Page</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Page Transitions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Click any button to see the entire page transition with that effect:</p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setPageEffect("fade")}
                variant={pageEffect === "fade" ? "default" : "outline"}
              >
                Fade Effect
              </Button>
              <Button
                onClick={() => setPageEffect("slide")}
                variant={pageEffect === "slide" ? "default" : "outline"}
              >
                Slide Effect
              </Button>
              <Button
                onClick={() => setPageEffect("scale")}
                variant={pageEffect === "scale" ? "default" : "outline"}
              >
                Scale Effect
              </Button>
              <Button
                onClick={() => setPageEffect("flip")}
                variant={pageEffect === "flip" ? "default" : "outline"}
              >
                Flip Effect
              </Button>
              <Button
                onClick={() => setPageEffect("bounce")}
                variant={pageEffect === "bounce" ? "default" : "outline"}
              >
                Bounce Effect
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid gap-8">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Continuous Pulse Animation</CardTitle>
          </CardHeader>
          <CardContent>
            <motion.div 
              className="w-32 h-32 mx-auto bg-red-500 rounded-xl shadow-lg"
              animate={pulseAnimation}
            />
            <p className="mt-4 text-center">This box should continuously pulse and change colors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>On-Demand Animation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Button 
              variant="default" 
              size="lg" 
              onClick={triggerAnimation}
              className="mb-8"
            >
              Click to Animate ({count})
            </Button>
            
            <motion.div 
              key={count}
              className="w-40 h-40 bg-primary rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-xl"
              initial="initial"
              animate="animate"
              variants={boxVariants}
            >
              Animation {count}
            </motion.div>
          </CardContent>
        </Card>
        
        <SectionTransition 
          effect="bounce" 
          className="mt-8"
          staggerChildren={true}
        >
          <Card className="mb-4">
            <CardContent>
              <h3 className="text-xl font-bold">Staggered Children 1</h3>
              <p>This should animate when scrolled into view</p>
            </CardContent>
          </Card>
          
          <Card className="mb-4">
            <CardContent>
              <h3 className="text-xl font-bold">Staggered Children 2</h3>
              <p>This should animate shortly after the first one</p>
            </CardContent>
          </Card>
          
          <Card className="mb-4">
            <CardContent>
              <h3 className="text-xl font-bold">Staggered Children 3</h3>
              <p>This should animate shortly after the second one</p>
            </CardContent>
          </Card>
        </SectionTransition>
        
        <div className="h-screen flex items-center justify-center bg-gray-100 rounded-xl my-12">
          <h2 className="text-2xl font-bold">Scroll past this spacer to see more animations</h2>
        </div>
        
        <SectionTransition effect="scale" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Scale Animation</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card should animate with a scale effect when scrolled into view</p>
            </CardContent>
          </Card>
        </SectionTransition>
        
        <SectionTransition effect="flip" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Flip Animation</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card should animate with a flip effect when scrolled into view</p>
            </CardContent>
          </Card>
        </SectionTransition>
        
        <SectionTransition effect="slide" direction="left" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Slide Left Animation</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card should slide in from the left when scrolled into view</p>
            </CardContent>
          </Card>
        </SectionTransition>
        
        <SectionTransition effect="slide" direction="right" className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Slide Right Animation</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This card should slide in from the right when scrolled into view</p>
            </CardContent>
          </Card>
        </SectionTransition>
      </div>
      </div>
    </PageTransition>
  );
}