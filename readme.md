# GolosinaLang


*Undergoing rewrite, if for some reason the interpreter is not working revert back to commit "921c0309edaf965e730f60dca4a0d491c0907a51"*

#### NOTE:
This is the closest thing I will make to an official specification for the time being.
This is not meant to be a super in-depth writeup. Rather something that aims to be practical in order to grasp the basics of the language and its
design.


## What is Golosina?

**Golosina is a dynamically typed, prototype oriented language meant to be fun to use, easy to read, and simple to learn.**

As someone who tinkers on his machine a lot, I have found myself in situtations where I feel a sense of dread when it comes to writing shell code for automation.
Golosina was made to hopefully fill that feeling as well, the language has support for direct shell embedding if necessary and in the future I plant to implement
some sort of concurrency model.

Golosina took a lot of insipiration from languages like IO, Javascript, lua, and ruby. IO and JS for its prototype design model (IO is also easy to read),
lua for its simplicity and lastly ruby, because in ruby everything is an object. Just how the human body has cells which can make tissue, in a pure OOP language
(something I am aiming achieve here) there is objects that can make greater objects, a concept that ruby implements well.

At the present time, there is only two interpreters which are still undergoing development. 
One is being built in nodejs in order for me to quickly
prototype and take different design choices with ease, and another interpreter is being built in c++, the goal is to fully implement the c++ one.
There is still a long road ahead but I have been steadily working on both.


## What is a prototype oriented language?

A prototye oriented language is a programming language, that aims to achieve Object Oriented Programming through the **Prototype** rather than the class.
The class is simply a blueprint for an object, a prototype is simply an object that is a parent to a derived object. The main takeway is that prototypes
thrive at runtime, and classes do not.

The reason I went for the prototype design was for a few main reasons:

1. A prototype design is easy to build within the interpreter.
2. A prottoype design is extremely powerful and flexible, you can create an entire class system with private, public fields if the user felt like it. (take a look at JS, there is a whole bunch of syntatic sugar built around its prototype design).
3. A prototype design is fundamentally simpler than a class based design, this is particularly due to the concepts introduces within both.
  In a prototypal language all you need to know is what an object is and the 4 basic principles of oop and how to implement some object composition. 
  In a class based language you need to be introduced to many concepts like:
    - Interfaces
    - Abstract Classes
    - Protected, Public, Private
    - Static Classes
    - etc.
  Obviously people will eventually tackle these concepts but, in a prototypal language I believe there is a simpler and more gentle introduction to
  programming and OOP in general.
4. A prototypal design thrives in a fully dynamically typed language, everything from typchecking to member lookup, to prototype lookup is easily done at runtime.
   In many class based languages, there is typically a frontend phase before reaching the runtime phase where the classes bind all their members together and verify.
   This in my personal opinion takes away from dynamic elements of a dynamic language.

# Examples

### Comments

```
  # This is how you can write a comment in golosina.  
```

### Variables

```
  const x = "Hello World";
```

```
  const y = "Hi";
```

### If Statements

```
  if (y == "Hello") {
    # If
  } else if (y == "Hi") {
    # Else If
  } else {
    # Else
  };
```

### Case Statement Expressions

Similar to languages like Nim, cases can be used as standalone statements or expressions. Ultimately whatever you choose to do,
the expression will have to return something, and if there is no specified return it will implicitly return Null.

```
  case (y) {
    of "Hi" {
      return 0;
    }

    of "Hello" {
     return "1" 
    }

    default {
      return 10;
    }
  };
```

```
  y = case (y) {
    of "Hi" {
      return 0;
    }

    of "Hello" {
     return "1" 
    }

    default {
      return 10;
    }
  };
```

## Loops

### While Statements

```
  let i = 0;
  while (i < 5) {
    ++i;
  };
```

### For Statements

```
  for (let i = 0; i < 10; ++i) {
    # Code in Here.
  };
```

## OOP

### Objects And Members

In order to instantiate a new object in golosina, you must first inherit the base object.

```
  const myObj = clone Object {
    y = 10,
    x = 30
  };
```

### Methods

Methods are procedures that can only act within an object, you can declare methods as follows.

```
  const x = {
    myMethod = method () {
      let x = 10;

      fmt->print("Returning:", x);

      return x;
    },

    greetAndCallMyMethod = method (name) {
      fmt->print("Hello, ", name);

      # You can reference the current object via the "this" keyword.
      
      return this->myMethod();
    }
  };

  x->greetAndCallMyMethod("Jake");
```

### Composition

In golosina you can achieve object composition by assigning an objects member to a reference of another object.

```
  const secondaryObj = clone Object {
    dependency = myObj,
    another = "MyField"  
  };
```

### Inheritance

As you have seen in the previous examples, you can achieve inheritance via the *"clone"* keyword.
When you clone an object, you instantiate a new instance of an object and set its prototype to whatever you are cloning.

When you need to use a member from a prototype object in some application, a *prototype chain* is initiated in order to recursively go through
prototypes and look for a matching member, until the *null* protoype is reached. If no member is found and the *null* prototype is reached,
the interpreter will throw an error mentioning the fact that the member you are referencing does not exist.

```
  const inheritFromMyObj = clone myObj {
    z = "Another field"
  };

  fmt->print(inheritFromMyObj->x);
```

### Example/Test Programs

For example/test programs, you can go to this repositories [test](https://github.com/NM711/GolosinaLangTS/tree/master/test) file.

## Running

You can run golosina by doing the following


```
  git clone https://github.com/NM711/GolosinaLangTS.git
```

```
  cd GolosinaLangTS
```

```
  npm install
```

### Running The Repl

```
  npm run repl
```


### Running Files

```
  npm run golosina -- <your-file-path-here> <flags>
```

#### Flags

```
  --dump-ast    # This will print the AST in JSON format
  --dump-tokens # This will print the tokens also in JSON format
```

## TODO

* Module System
